"""Web dashboard + analytics collection endpoint."""
import datetime as dt
import hmac
import json
import os
import threading
import time

from flask import Flask, Response, abort, redirect, request, send_file, session, url_for

from . import analytics, auditor, db, monitor, report
from .charts import uptime_strip
from .config import get_site


def create_app(cfg):
    app = Flask(__name__)
    app.secret_key = cfg.get("secret_key") or os.urandom(24)
    password = cfg.get("dashboard_password")
    running_audits = set()

    @app.before_request
    def auth():
        if not password or request.path in ("/t.js", "/collect", "/health"):
            return
        a = request.authorization
        if not a or not hmac.compare_digest(a.password or "", password):
            return Response("Login required", 401, {"WWW-Authenticate": 'Basic realm="SiteWatch"'})

    def flash(msg):
        session["flash"] = msg

    def pop_flash():
        return session.pop("flash", None)

    # ---- analytics ------------------------------------------------------
    @app.get("/t.js")
    def tracker():
        return Response(analytics.TRACKER_JS, mimetype="application/javascript",
                        headers={"Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*"})

    @app.route("/collect", methods=["POST", "OPTIONS"])
    def collect():
        cors = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type"}
        if request.method == "OPTIONS":
            return Response("", 204, cors)
        try:
            payload = json.loads(request.get_data(as_text=True) or "{}")
        except ValueError:
            return Response("", 400, cors)
        site = get_site(cfg, str(payload.get("s", "")))
        if not site or not site.get("track_analytics"):
            return Response("", 404, cors)
        ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
        analytics.record_hit(cfg["data_dir"], site, payload, ip, request.headers.get("User-Agent", ""))
        return Response("", 204, cors)

    @app.get("/health")
    def health():
        return {"ok": True}

    # ---- dashboard ------------------------------------------------------
    def fmt_ago(ts):
        if not ts:
            return "never"
        s = time.time() - ts
        return f"{int(s)}s ago" if s < 90 else f"{int(s / 60)} min ago" if s < 5400 else \
            dt.datetime.fromtimestamp(ts).strftime("%d %b %H:%M")

    @app.get("/")
    def index():
        now = time.time()
        rows = []
        for s in cfg["sites"]:
            last = db.q1("SELECT * FROM checks WHERE site_id=? ORDER BY ts DESC LIMIT 1", (s["id"],))
            inc = db.open_incident(s["id"])
            u24 = monitor.uptime_stats(s["id"], now - 86400)
            u30 = monitor.uptime_stats(s["id"], now - 30 * 86400)
            series = {r["day"]: r["uptime"] for r in monitor.daily_series(s["id"], now - 30 * 86400, now)}
            days = [(dt.date.today() - dt.timedelta(days=29 - i)).isoformat() for i in range(30)]
            au = db.latest_audit(s["id"])
            vis = analytics.summary(s["id"], now - 30 * 86400, now).get("visitors", 0)
            rows.append({
                **s,
                "status": "down" if inc else ("up" if last and last["ok"] else ("unknown" if not last else "warn")),
                "down_since": dt.datetime.fromtimestamp(inc["started"]).strftime("%d %b %H:%M") if inc else None,
                "error": last["error"] if last else None,
                "up24": f"{u24['uptime']:.2f}%" if u24["uptime"] is not None else "—",
                "up30": f"{u30['uptime']:.2f}%" if u30["uptime"] is not None else "—",
                "ms": f"{last['response_ms']} ms" if last and last["response_ms"] else "—",
                "visitors": f"{vis:,}",
                "last_check": fmt_ago(last["ts"] if last else None),
                "ssl": last["ssl_days_left"] if last else None,
                "score": au["scores"]["Overall"] if au else None,
                "issues": sum(1 for i in au["issues"] if i["severity"] == "high") if au else None,
                "strip": uptime_strip([(d, series.get(d)) for d in days]),
            })
        return report.env.get_template("index.html").render(
            sites=rows, cfg=cfg, now=dt.datetime.now().strftime("%H:%M"), flash=pop_flash())

    @app.get("/site/<site_id>")
    def site_page(site_id):
        site = get_site(cfg, site_id) or abort(404)
        today = dt.date.today()
        ctx = report.build(cfg, site, today.year, today.month)
        ctx["period"] = today.strftime("%B %Y") + " (live)"
        msg = pop_flash()
        if site_id in running_audits:
            msg = (msg + " " if msg else "") + "An audit is running; refresh in a minute."
        return report.render({**ctx, "nav": True, "flash": msg})

    @app.post("/api/check/<site_id>")
    def check_now(site_id):
        site = get_site(cfg, site_id) or abort(404)
        r = monitor.check_site(cfg, site)
        flash(f"{site['name']}: " + (f"up, HTTP {r['status_code']} in {r['response_ms']} ms" if r["ok"] else f"FAILED – {r['error']}"))
        return redirect(request.referrer or url_for("index"))

    @app.post("/api/audit/<site_id>")
    def audit_now(site_id):
        site = get_site(cfg, site_id) or abort(404)
        if site_id not in running_audits:
            running_audits.add(site_id)

            def job():
                try:
                    auditor.audit_site(cfg, site)
                finally:
                    running_audits.discard(site_id)
            threading.Thread(target=job, daemon=True).start()
        flash(f"Audit of {site['name']} started — results appear in about a minute.")
        return redirect(request.referrer or url_for("index"))

    @app.get("/reports/<site_id>")
    def reports(site_id):
        site = get_site(cfg, site_id) or abort(404)
        first = db.q1("SELECT MIN(ts) t FROM checks WHERE site_id=?", (site_id,))["t"] or time.time()
        d = dt.date.fromtimestamp(first).replace(day=1)
        months = []
        while d <= dt.date.today():
            months.append({"key": d.strftime("%Y-%m"), "label": d.strftime("%B %Y") +
                           (" (in progress)" if d.month == dt.date.today().month and d.year == dt.date.today().year else "")})
            d = (d + dt.timedelta(days=32)).replace(day=1)
        return report.env.get_template("reports.html").render(site=site, months=months[::-1], cfg=cfg)

    @app.get("/report/<site_id>/<period>")
    def report_view(site_id, period):
        site = get_site(cfg, site_id) or abort(404)
        pdf = period.endswith(".pdf")
        try:
            year, month = map(int, period.removesuffix(".pdf").split("-"))
        except ValueError:
            abort(404)
        paths = report.generate(cfg, site, year, month, pdf=pdf)
        if pdf:
            if "pdf" not in paths:
                return Response("PDF export needs Playwright: pip install playwright && playwright install chromium", 501)
            return send_file(os.path.abspath(paths["pdf"]), as_attachment=True,
                             download_name=f"{site['id']}-report-{year}-{month:02d}.pdf")
        return send_file(os.path.abspath(paths["html"]))

    return app
