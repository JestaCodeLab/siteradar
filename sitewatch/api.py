"""JSON API used by the Next.js dashboard. Everything lives under /api and needs a login session."""
import datetime as dt
import json
import logging
import os
import threading
import time

from flask import Blueprint, Response, abort, g, jsonify, request, send_file

from . import accounts, alerts, analytics, auditor, db, health, invoice_parse, monitor, plans, report, screenshot, sites, sub_report, subscriptions
from .ctx import need, workspace_required

log = logging.getLogger("sitewatch.api")


def blueprint(cfg):
    bp = Blueprint("api", __name__, url_prefix="/api")
    running_audits = set()
    running_health = set()
    running_shots = set()

    def site_or_404(site_id):
        return sites.get(g.ws["id"], site_id) or abort(404, "Unknown website")

    @bp.before_request
    def guard():
        """Everything in this blueprint needs a signed-in member of a workspace; viewers can only read."""
        denied = workspace_required(lambda: None)()
        if denied:
            return denied
        if request.method not in ("GET", "HEAD", "OPTIONS") and g.role == "viewer":
            return jsonify(error="You have view-only access.", code="forbidden"), 403

    def body():
        return request.get_json(silent=True) or {}

    @bp.errorhandler(ValueError)
    def bad_value(e):
        return jsonify(error=str(e)), 400

    @bp.errorhandler(plans.LimitError)
    def over_limit(e):
        return jsonify(error=str(e), code="limit"), 402

    @bp.errorhandler(404)
    def not_found(e):
        return jsonify(error=getattr(e, "description", "Not found")), 404

    # ---- activity and settings -------------------------------------------
    @bp.get("/activity")
    def activity():
        limit = min(max(int(request.args.get("limit", 50)), 1), 200)
        ws_id = g.ws["id"]
        names = {x["id"]: x["name"] for x in db.q("SELECT id, name FROM sites WHERE workspace_id=?", (ws_id,))}
        ids = list(names)
        sub_ids = [str(x["id"]) for x in db.q("SELECT id FROM subscriptions WHERE workspace_id=?", (ws_id,))]
        events = []

        def add(ts, kind, level, title, detail="", site_id=None):
            events.append({"ts": ts, "kind": kind, "level": level, "title": title, "detail": detail,
                           "site_id": site_id if site_id in names else None, "site_name": names.get(site_id)})

        for i in db.q("SELECT * FROM incidents WHERE site_id = ANY(?) ORDER BY started DESC LIMIT ?", (ids, limit)):
            n = names.get(i["site_id"], i["site_id"])
            add(i["started"], "down", "bad", f"{n} went down", i["cause"] or "", i["site_id"])
            if i["ended"]:
                mins = max(1, round((i["ended"] - i["started"]) / 60))
                add(i["ended"], "recovered", "ok", f"{n} is back up", f"Down for {mins} minute{'' if mins == 1 else 's'}", i["site_id"])
        for a in db.q("SELECT * FROM alerts_sent WHERE site_id = ANY(?) OR (site_id = '' AND split_part(kind, ':', 2) = ANY(?)) ORDER BY ts DESC LIMIT ?",
                        (ids, sub_ids, limit)):
            if a["kind"].startswith("renewal:"):
                add(a["ts"], "renewal", "warn", f"Renewal reminder: {a['message']}", "Email sent to the team")
            elif a["kind"].startswith("domain:"):
                add(a["ts"], "domain", "bad" if ":expired:" in a["kind"] else "warn", a["message"], "Alert sent", a["site_id"])
            elif a["kind"] == "dns":
                add(a["ts"], "dns", "warn", a["message"], "Alert sent", a["site_id"])
            elif a["kind"] in ("ssl", "slow"):
                add(a["ts"], a["kind"], "warn", a["message"], "Alert sent", a["site_id"])
        for a in db.q("SELECT site_id, ts, pages, scores FROM audits WHERE site_id = ANY(?) ORDER BY ts DESC LIMIT ?", (ids, limit)):
            score = json.loads(a["scores"]).get("Overall")
            add(a["ts"], "audit", "info", f"Audit completed for {names.get(a['site_id'], a['site_id'])}",
                f"Score {score}, {a['pages']} pages crawled", a["site_id"])
        for i in db.q("""SELECT i.uploaded ts, i.original_name, s.name, s.site_id FROM invoices i
                         JOIN subscriptions s ON s.id = i.subscription_id WHERE s.workspace_id = ?
                         ORDER BY i.uploaded DESC LIMIT ?""", (ws_id, limit)):
            add(i["ts"], "invoice", "info", f"Invoice uploaded for {i['name']}", i["original_name"] or "", i["site_id"])
        for s_ in db.q("SELECT name, created, site_id FROM subscriptions WHERE workspace_id=? ORDER BY created DESC LIMIT ?", (ws_id, limit)):
            add(s_["created"], "subscription", "info", f"Subscription added: {s_['name']}", "", s_["site_id"])
        events.sort(key=lambda e: -e["ts"])
        return jsonify(events=events[:limit])

    @bp.get("/settings")
    def settings():
        ws = g.ws
        plan = plans.limits(ws)
        return jsonify(
            alerts={"emails": ws["alert_emails"], "phones": ws["alert_phones"], "webhooks": ws["alert_webhooks"],
                    "channels": plan["channels"], "sms_quota": plans.sms_quota(ws), "sms_used": plans.sms_used(ws["id"])},
            monitoring={"check_interval_minutes": plan["interval_minutes"], "failures_before_alert": cfg["failures_before_alert"],
                        "timeout_seconds": cfg["timeout_seconds"], "slow_threshold_ms": cfg["slow_threshold_ms"],
                        "ssl_warning_days": cfg["ssl_warning_days"], "audit_daily_at": cfg["audit"]["daily_at"],
                        "audit_max_pages": cfg["audit"]["max_pages"], "report_day_of_month": cfg["report"]["day_of_month"],
                        "report_at": cfg["report"]["at"], "timezone": os.environ.get("TZ", "server default"),
                        "history_months": plan["history_months"]},
        )

    @bp.patch("/settings/alerts")
    @need("admin")
    def save_alert_settings():
        data = body()
        plan = plans.limits(g.ws)
        if data.get("alert_phones") and "sms" not in plan["channels"]:
            raise plans.LimitError("SMS alerts are part of the Growth plan and above.")
        if data.get("alert_webhooks") and "chat" not in plan["channels"]:
            raise plans.LimitError("Chat alerts are part of the Starter plan and above.")
        g.ws = accounts.update_workspace(g.ws["id"], {k: data[k] for k in ("alert_emails", "alert_phones", "alert_webhooks") if k in data})
        return settings()

    @bp.post("/settings/test-alert")
    @need("admin")
    def test_alert():
        ok = alerts.notify(cfg, {"workspace_id": g.ws["id"]}, "SiteWatch test alert", "If you can read this, alerts are working.")
        return jsonify(sent=ok, to=g.ws["alert_emails"]), (200 if ok else 502)

    # ---- websites --------------------------------------------------------
    def row_status(s, last, inc):
        if s.get("paused"):
            return "paused"
        if inc:
            return "down"
        if not last:
            return "unknown"
        if not last["ok"]:
            return "warn"
        return "slow" if last["response_ms"] and last["response_ms"] > cfg["slow_threshold_ms"] else "up"

    def day_strip(site_id, days=30):
        now = time.time()
        series = {r["day"]: r["uptime"] for r in monitor.daily_series(site_id, now - days * 86400, now)}
        out = []
        for i in range(days):
            d = (dt.date.today() - dt.timedelta(days=days - 1 - i)).isoformat()
            out.append({"day": d, "uptime": series.get(d)})
        return out

    def site_card(s):
        now = time.time()
        last = db.q1("SELECT * FROM checks WHERE site_id=? ORDER BY ts DESC LIMIT 1", (s["id"],))
        inc = db.open_incident(s["id"])
        u30 = monitor.uptime_stats(s["id"], now - 30 * 86400)
        au = db.latest_audit(s["id"])
        dom = db.q1("SELECT expires FROM domain_checks WHERE site_id=? ORDER BY ts DESC LIMIT 1", (s["id"],))
        ssl_expires = last["ssl_expires"] if last else None
        if not ssl_expires and last and last["ssl_days_left"] is not None:       # checks saved before the date was stored
            ssl_expires = (dt.datetime.fromtimestamp(last["ts"]) + dt.timedelta(days=last["ssl_days_left"])).date().isoformat()
        return {
            "ssl_expires": ssl_expires,
            "domain_expires": dom["expires"] if dom else None,
            "domain_days": health.domains.days_left(dom["expires"]) if dom and dom["expires"] else None,
            "id": s["id"], "name": s["name"], "url": s["url"], "host": s["url"].split("//")[-1],
            "paused": s.get("paused", False), "keyword": s.get("keyword"), "owner": s.get("owner", ""),
            "report_to": s.get("report_to", []), "alert_to": s.get("alert_to", []),
            "track_analytics": s["track_analytics"], "audit_enabled": s["audit"],
            "status": row_status(s, last, inc), "error": last["error"] if last else None,
            "down_since": inc["started"] if inc else None,
            "last_check": last["ts"] if last else None,
            "response_ms": last["response_ms"] if last else None,
            "ssl_days": last["ssl_days_left"] if last else None,
            "uptime30": u30["uptime"], "avg_ms30": u30["avg_ms"],
            "audit_score": au["scores"]["Overall"] if au else None,
            "visitors30": analytics.summary(s["id"], now - 30 * 86400, now).get("visitors", 0),
            "strip": day_strip(s["id"]),
        }

    @bp.get("/sites")
    def list_sites():
        cards = [site_card(s) for s in sites.list_ws(g.ws["id"])]
        resp = [c["response_ms"] for c in cards if c["status"] != "down" and c["response_ms"]]
        return jsonify(
            sites=cards,
            summary={
                "total": len(cards),
                "up": sum(1 for c in cards if c["status"] in ("up", "slow", "unknown")),
                "down": [c["name"] for c in cards if c["status"] in ("down", "warn")],
                "slow": [c["name"] for c in cards if c["status"] == "slow"],
                "avg_response_ms": round(sum(resp) / len(resp)) if resp else None,
                "domains_expiring": [{"name": c["name"], "days": c["domain_days"], "expires": c["domain_expires"]} for c in cards
                                     if c["domain_days"] is not None and c["domain_days"] <= 60],
                "ssl_expiring": [{"name": c["name"], "days": c["ssl_days"], "expires": c["ssl_expires"]} for c in cards
                                 if c["ssl_days"] is not None and c["ssl_days"] <= 30],
                "errors": {c["name"]: c["error"] for c in cards if c["status"] in ("down", "warn")},
                "slow_threshold_ms": cfg["slow_threshold_ms"],
                "ssl_warning_days": cfg["ssl_warning_days"],
                "check_interval_minutes": plans.limits(g.ws)["interval_minutes"],
                "latest_check": max([c["last_check"] for c in cards if c["last_check"]], default=None),
            })

    @bp.post("/sites")
    def add_site():
        site = sites.create(cfg, g.ws, body())
        # first check right away so the new site shows a status instead of "unknown"
        threading.Thread(target=monitor.check_site, args=(cfg, site), daemon=True).start()
        threading.Thread(target=health.run_all, args=(cfg, site), daemon=True).start()
        return jsonify(site_card(site)), 201

    @bp.get("/sites/<site_id>")
    def site_detail(site_id):
        s = site_or_404(site_id)
        now = time.time()
        card = site_card(s)
        up = monitor.uptime_stats(site_id, now - 30 * 86400)
        series = monitor.daily_series(site_id, now - 30 * 86400, now)
        incidents = monitor.uptime_stats(site_id, now - 90 * 86400)["incidents"]
        au = db.latest_audit(site_id)
        a = analytics.summary(site_id, now - 30 * 86400, now)
        return jsonify({
            **card,
            "uptime_stats": {"uptime": up["uptime"], "avg_ms": up["avg_ms"], "p95_ms": up["p95_ms"],
                             "downtime_minutes": up["downtime_minutes"], "incident_count": len(up["incidents"])},
            "response_series": [{"day": r["day"], "ms": r["avg_ms"]} for r in series],
            "incidents": [{"started": i["started"], "ended": i["ended"], "cause": i["cause"]}
                          for i in incidents[::-1][:10]],
            "top_issues": [i for i in (au["issues"] if au else []) if i["severity"] == "high"][:5],
            "audit_ts": au["ts"] if au else None,
            "pagespeed": au["pagespeed"] if au else None,
            "tracking_live": bool(db.q1("SELECT 1 FROM hits WHERE site_id=? AND ts>? LIMIT 1", (site_id, now - 86400))),
            "pageviews30": a.get("pageviews", 0),
            "snippet": f'<script defer src="{cfg["public_url"]}/t.js" data-site="{site_id}"></script>',
            "audit_running": site_id in running_audits,
            "preview": {"desktop": screenshot.captured_at(cfg, site_id, "desktop"),
                        "mobile": screenshot.captured_at(cfg, site_id, "mobile"),
                        "running": site_id in running_shots},
        })

    @bp.patch("/sites/<site_id>")
    def edit_site(site_id):
        site_or_404(site_id)
        sites.update(cfg, site_id, body())
        return jsonify(site_card(sites.get(g.ws["id"], site_id)))

    @bp.delete("/sites/<site_id>")
    def remove_site(site_id):
        site_or_404(site_id)
        sites.delete(cfg, site_id)
        return jsonify(ok=True)

    @bp.get("/sites/<site_id>/analytics")
    def site_analytics(site_id):
        site_or_404(site_id)
        days = min(max(int(request.args.get("days", 30)), 1), 365)
        now = time.time()
        a = analytics.summary(site_id, now - days * 86400, now)
        prev = analytics.summary(site_id, now - 2 * days * 86400, now - days * 86400)
        return jsonify(days=days, current=a, previous={k: prev.get(k) for k in ("visitors", "pageviews", "bounce_rate")})

    @bp.get("/sites/<site_id>/audit")
    def site_audit(site_id):
        site_or_404(site_id)
        au = db.latest_audit(site_id)
        return jsonify(audit=au, running=site_id in running_audits, categories=auditor.CATEGORIES)

    @bp.get("/sites/<site_id>/screenshot")
    def site_screenshot(site_id):
        site_or_404(site_id)
        device = request.args.get("device", "desktop")
        if device not in screenshot.DEVICES:
            abort(404)
        data = screenshot.image(cfg, site_id, device)
        if not data:
            abort(404, "No preview yet")
        resp = Response(data, mimetype="image/jpeg")
        resp.headers["Cache-Control"] = "private, no-cache"
        return resp

    @bp.post("/sites/<site_id>/screenshot")
    def refresh_screenshot(site_id):
        s = site_or_404(site_id)
        if site_id not in running_shots:
            running_shots.add(site_id)

            def job():
                try:
                    screenshot.capture(cfg, s)
                except Exception as e:
                    log.warning("Preview failed for %s: %s", site_id, e)
                finally:
                    running_shots.discard(site_id)
            threading.Thread(target=job, daemon=True).start()
        return jsonify(started=True), 202

    @bp.get("/sites/<site_id>/health")
    def site_health(site_id):
        site_or_404(site_id)
        return jsonify(**health.latest(site_id), running=site_id in running_health)

    @bp.post("/sites/<site_id>/health")
    def refresh_health(site_id):
        s = site_or_404(site_id)
        if site_id not in running_health:
            running_health.add(site_id)

            def job():
                try:
                    health.run_all(cfg, s)
                finally:
                    running_health.discard(site_id)
            threading.Thread(target=job, daemon=True).start()
        return jsonify(started=True), 202

    @bp.post("/sites/<site_id>/check")
    def check_now(site_id):
        r = monitor.check_site(cfg, site_or_404(site_id))
        return jsonify(ok=r["ok"], status_code=r["status_code"], response_ms=r["response_ms"], error=r["error"])

    @bp.post("/sites/<site_id>/audit")
    def audit_now(site_id):
        s = site_or_404(site_id)
        if site_id not in running_audits:
            running_audits.add(site_id)

            def job():
                try:
                    auditor.audit_site(cfg, s)
                finally:
                    running_audits.discard(site_id)
            threading.Thread(target=job, daemon=True).start()
        return jsonify(started=True), 202

    @bp.get("/sites/<site_id>/reports")
    def site_reports(site_id):
        site_or_404(site_id)
        first = db.q1("SELECT MIN(ts) t FROM checks WHERE site_id=?", (site_id,))["t"] or time.time()
        d = dt.date.fromtimestamp(first).replace(day=1)
        today = dt.date.today()
        months = []
        while d <= today:
            months.append({"period": d.strftime("%Y-%m"), "label": d.strftime("%B %Y"),
                           "in_progress": (d.year, d.month) == (today.year, today.month)})
            d = (d + dt.timedelta(days=32)).replace(day=1)
        return jsonify(months=months[::-1], recipients=sites.get(g.ws["id"], site_id).get("report_to", []))

    @bp.get("/sites/<site_id>/reports/<period>.<fmt>")
    def site_report_file(site_id, period, fmt):
        s = site_or_404(site_id)
        if fmt not in ("html", "pdf"):
            abort(404)
        try:
            year, month = map(int, period.split("-"))
            dt.date(year, month, 1)
        except ValueError:
            abort(404)
        paths = report.generate(cfg, s, year, month, pdf=(fmt == "pdf"))
        if fmt == "pdf":
            if "pdf" not in paths:
                return jsonify(error="PDF export is not available on this server."), 501
            return send_file(os.path.abspath(paths["pdf"]), as_attachment=True,
                             download_name=f"{site_id}-report-{period}.pdf")
        return send_file(os.path.abspath(paths["html"]))

    # ---- subscriptions ---------------------------------------------------
    def form_or_json():
        if request.is_json:
            return body()
        d = request.form.to_dict()
        for f in ("auto_renew", "active"):
            if f in d:
                d[f] = d[f].lower() in ("1", "true", "on", "yes")
        return d

    @bp.get("/subscriptions")
    def list_subscriptions():
        return jsonify(subscriptions=subscriptions.list_all(g.ws["id"], request.args.get("site") or None),
                       summary=subscriptions.summary(g.ws["id"]), categories=subscriptions.CATEGORIES)

    @bp.post("/subscriptions")
    def add_subscription():
        data = form_or_json()
        sub_id = subscriptions.create(g.ws["id"], data)
        f = request.files.get("invoice")
        if f and f.filename:
            try:
                subscriptions.add_invoice(cfg, sub_id, f, data.get("invoice_period"))
            except ValueError:
                subscriptions.delete(cfg, sub_id)
                raise
        return jsonify(subscriptions.get(g.ws["id"], sub_id)), 201

    @bp.get("/subscriptions/<int:sub_id>")
    def get_subscription(sub_id):
        return jsonify(subscriptions.get(g.ws["id"], sub_id) or abort(404, "Unknown subscription"))

    @bp.patch("/subscriptions/<int:sub_id>")
    def edit_subscription(sub_id):
        subscriptions.get(g.ws["id"], sub_id) or abort(404, "Unknown subscription")
        subscriptions.update(g.ws["id"], sub_id, form_or_json())
        return jsonify(subscriptions.get(g.ws["id"], sub_id))

    @bp.delete("/subscriptions/<int:sub_id>")
    def remove_subscription(sub_id):
        subscriptions.get(g.ws["id"], sub_id) or abort(404, "Unknown subscription")
        subscriptions.delete(cfg, sub_id)
        return jsonify(ok=True)

    @bp.post("/subscriptions/<int:sub_id>/invoices")
    def upload_invoice(sub_id):
        subscriptions.get(g.ws["id"], sub_id) or abort(404, "Unknown subscription")
        f = request.files.get("invoice")
        if not f or not f.filename:
            raise ValueError("Choose a PDF to upload.")
        subscriptions.add_invoice(cfg, sub_id, f, request.form.get("period"))
        return jsonify(subscriptions.get(g.ws["id"], sub_id)), 201

    @bp.post("/invoices/parse")
    def parse_invoice():
        f = request.files.get("invoice")
        if not f:
            raise ValueError("Choose a PDF to read.")
        data = f.read(subscriptions.MAX_PDF_BYTES + 1)
        if len(data) > subscriptions.MAX_PDF_BYTES or not data.startswith(b"%PDF"):
            raise ValueError("Only PDF files up to 4 MB can be read.")
        return jsonify(invoice_parse.parse(data))

    @bp.get("/invoices/<int:invoice_id>/file")
    def invoice_file(invoice_id):
        inv, data = subscriptions.invoice_file(cfg, g.ws["id"], invoice_id)
        if not inv or data is None:
            abort(404, "Invoice not found")
        return Response(data, mimetype="application/pdf",
                        headers={"Content-Disposition": f'inline; filename="{inv["original_name"] or "invoice.pdf"}"'})

    @bp.delete("/invoices/<int:invoice_id>")
    def remove_invoice(invoice_id):
        subscriptions.delete_invoice(cfg, g.ws["id"], invoice_id)
        return jsonify(ok=True)

    # ---- subscription reports --------------------------------------------
    def parse_period(period):
        try:
            year, month = map(int, period.split("-"))
            dt.date(year, month, 1)
        except ValueError:
            abort(404, "Unknown month")
        return year, month

    @bp.get("/subscription-reports")
    def subscription_report_list():
        out = []
        for p in subscriptions.available_months(g.ws["id"]):
            y, m = parse_period(p)
            r = subscriptions.build_report(g.ws["id"], y, m)
            out.append({"period": p, "label": r["label"], "total": r["total"], "in_progress": r["in_progress"]})
        return jsonify(months=out, recipients=g.ws["alert_emails"])

    @bp.get("/subscription-reports/<period>")
    def subscription_report(period):
        return jsonify(subscriptions.build_report(g.ws["id"], *parse_period(period)))

    @bp.get("/subscription-reports/<period>.<fmt>")
    def subscription_report_file(period, fmt):
        if fmt not in ("html", "pdf"):
            abort(404)
        paths = sub_report.generate(cfg, g.ws, *parse_period(period), pdf=(fmt == "pdf"))
        if fmt == "pdf":
            if "pdf" not in paths:
                return jsonify(error="PDF export is not available on this server."), 501
            return send_file(os.path.abspath(paths["pdf"]), as_attachment=True,
                             download_name=f"subscriptions-{period}.pdf")
        return send_file(os.path.abspath(paths["html"]))

    @bp.post("/subscription-reports/<period>/email")
    def subscription_report_email(period):
        year, month = parse_period(period)
        to = g.ws["alert_emails"]
        ok = sub_report.email(cfg, g.ws, year, month) if to else False
        return jsonify(sent=ok, to=to), (200 if ok else 502)

    return bp
