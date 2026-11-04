"""JSON API used by the Next.js dashboard. Everything lives under /api and needs a login session."""
import datetime as dt
import hmac
import json
import os
import threading
import time
from collections import defaultdict

from flask import Blueprint, Response, abort, jsonify, request, send_file, session

from . import analytics, auditor, db, invoice_parse, monitor, report, sites, sub_report, subscriptions
from .config import get_site

SESSION_DAYS = 30
_failures = defaultdict(list)       # ip -> timestamps of failed logins


def blueprint(cfg):
    bp = Blueprint("api", __name__, url_prefix="/api")
    running_audits = set()

    def site_or_404(site_id):
        return get_site(cfg, site_id) or abort(404, "Unknown website")

    def body():
        return request.get_json(silent=True) or {}

    @bp.errorhandler(ValueError)
    def bad_value(e):
        return jsonify(error=str(e)), 400

    @bp.errorhandler(404)
    def not_found(e):
        return jsonify(error=getattr(e, "description", "Not found")), 404

    # ---- auth ------------------------------------------------------------
    @bp.post("/auth/login")
    def login():
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
        now = time.time()
        _failures[ip] = [t for t in _failures[ip] if now - t < 900]
        if len(_failures[ip]) >= 10:
            return jsonify(error="Too many attempts. Try again in 15 minutes."), 429
        password = cfg.get("dashboard_password")
        given = str(body().get("password") or "")
        if password and not hmac.compare_digest(given, password):
            _failures[ip].append(now)
            return jsonify(error="Wrong username or password."), 401
        session.permanent = True
        session["auth"] = True
        return jsonify(ok=True)

    @bp.post("/auth/logout")
    def logout():
        session.clear()
        return jsonify(ok=True)

    @bp.get("/auth/me")
    def me():
        return jsonify(authenticated=True)

    # ---- websites --------------------------------------------------------
    def row_status(s, last, inc):
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
        return {
            "id": s["id"], "name": s["name"], "url": s["url"], "host": s["url"].split("//")[-1],
            "keyword": s.get("keyword"), "owner": s.get("owner", ""),
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
        cards = [site_card(s) for s in cfg["sites"]]
        resp = [c["response_ms"] for c in cards if c["status"] != "down" and c["response_ms"]]
        return jsonify(
            sites=cards,
            summary={
                "total": len(cards),
                "up": sum(1 for c in cards if c["status"] in ("up", "slow", "unknown")),
                "down": [c["name"] for c in cards if c["status"] in ("down", "warn")],
                "slow": [c["name"] for c in cards if c["status"] == "slow"],
                "avg_response_ms": round(sum(resp) / len(resp)) if resp else None,
                "ssl_expiring": [{"name": c["name"], "days": c["ssl_days"]} for c in cards
                                 if c["ssl_days"] is not None and c["ssl_days"] <= 30],
                "errors": {c["name"]: c["error"] for c in cards if c["status"] in ("down", "warn")},
                "slow_threshold_ms": cfg["slow_threshold_ms"],
                "ssl_warning_days": cfg["ssl_warning_days"],
                "check_interval_minutes": cfg["check_interval_minutes"],
                "latest_check": max([c["last_check"] for c in cards if c["last_check"]], default=None),
            })

    @bp.post("/sites")
    def add_site():
        site = sites.create(cfg, body())
        # first check right away so the new site shows a status instead of "unknown"
        threading.Thread(target=monitor.check_site, args=(cfg, site), daemon=True).start()
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
        })

    @bp.patch("/sites/<site_id>")
    def edit_site(site_id):
        site_or_404(site_id)
        sites.update(cfg, site_id, body())
        return jsonify(site_card(get_site(cfg, site_id)))

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
        return jsonify(months=months[::-1], recipients=get_site(cfg, site_id).get("report_to", []))

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
        return jsonify(subscriptions=subscriptions.list_all(request.args.get("site") or None),
                       summary=subscriptions.summary(), categories=subscriptions.CATEGORIES)

    @bp.post("/subscriptions")
    def add_subscription():
        data = form_or_json()
        sub_id = subscriptions.create(data)
        f = request.files.get("invoice")
        if f and f.filename:
            try:
                subscriptions.add_invoice(cfg, sub_id, f, data.get("invoice_period"))
            except ValueError:
                subscriptions.delete(cfg, sub_id)
                raise
        return jsonify(subscriptions.get(sub_id)), 201

    @bp.get("/subscriptions/<int:sub_id>")
    def get_subscription(sub_id):
        return jsonify(subscriptions.get(sub_id) or abort(404, "Unknown subscription"))

    @bp.patch("/subscriptions/<int:sub_id>")
    def edit_subscription(sub_id):
        subscriptions.get(sub_id) or abort(404, "Unknown subscription")
        subscriptions.update(sub_id, form_or_json())
        return jsonify(subscriptions.get(sub_id))

    @bp.delete("/subscriptions/<int:sub_id>")
    def remove_subscription(sub_id):
        subscriptions.get(sub_id) or abort(404, "Unknown subscription")
        subscriptions.delete(cfg, sub_id)
        return jsonify(ok=True)

    @bp.post("/subscriptions/<int:sub_id>/invoices")
    def upload_invoice(sub_id):
        subscriptions.get(sub_id) or abort(404, "Unknown subscription")
        f = request.files.get("invoice")
        if not f or not f.filename:
            raise ValueError("Choose a PDF to upload.")
        subscriptions.add_invoice(cfg, sub_id, f, request.form.get("period"))
        return jsonify(subscriptions.get(sub_id)), 201

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
        inv, path = subscriptions.invoice_path(cfg, invoice_id)
        if not inv or not os.path.exists(path):
            abort(404, "Invoice not found")
        return send_file(path, mimetype="application/pdf", download_name=inv["original_name"] or "invoice.pdf")

    @bp.delete("/invoices/<int:invoice_id>")
    def remove_invoice(invoice_id):
        subscriptions.delete_invoice(cfg, invoice_id)
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
        for p in subscriptions.available_months():
            y, m = parse_period(p)
            r = subscriptions.build_report(y, m)
            out.append({"period": p, "label": r["label"], "total": r["total"], "in_progress": r["in_progress"]})
        return jsonify(months=out, recipients=(cfg.get("alerts") or {}).get("email_to") or [])

    @bp.get("/subscription-reports/<period>")
    def subscription_report(period):
        return jsonify(subscriptions.build_report(*parse_period(period)))

    @bp.get("/subscription-reports/<period>.<fmt>")
    def subscription_report_file(period, fmt):
        if fmt not in ("html", "pdf"):
            abort(404)
        paths = sub_report.generate(cfg, *parse_period(period), pdf=(fmt == "pdf"))
        if fmt == "pdf":
            if "pdf" not in paths:
                return jsonify(error="PDF export is not available on this server."), 501
            return send_file(os.path.abspath(paths["pdf"]), as_attachment=True,
                             download_name=f"subscriptions-{period}.pdf")
        return send_file(os.path.abspath(paths["html"]))

    @bp.post("/subscription-reports/<period>/email")
    def subscription_report_email(period):
        year, month = parse_period(period)
        to = (cfg.get("alerts") or {}).get("email_to") or []
        ok = sub_report.email(cfg, year, month) if to else False
        return jsonify(sent=ok, to=to), (200 if ok else 502)

    return bp
