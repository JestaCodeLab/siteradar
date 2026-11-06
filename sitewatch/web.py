"""Flask app: JSON API for the dashboard plus the public analytics collection endpoint."""
import datetime as dt
import hashlib
import json
import os

from flask import Flask, Response, jsonify, request

from . import accounts, admin_api, analytics, api, auth_api, ctx, db, plans, security, sites

SESSION_DAYS = 30


def create_app(cfg):
    app = Flask(__name__)
    # Signing key for login cookies: set SECRET_KEY on the server; the fallback is derived from the database URL.
    secret = cfg.get("secret_key") or os.environ.get("SECRET_KEY")
    if not secret and str(os.environ.get("APP_URL", cfg.get("public_url", ""))).startswith("https://"):
        raise RuntimeError("SECRET_KEY is not set. Login cookies would be signed with a guessable key; set a long random SECRET_KEY.")
    app.secret_key = secret or hashlib.sha256(
        ("sitewatch-session:" + (cfg.get("database_url") or os.environ.get("DATABASE_URL", "dev"))).encode()).hexdigest()
    app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_HTTPONLY=True,
                      SESSION_COOKIE_SECURE=any(str(u).startswith("https://") for u in (cfg.get("public_url", ""), os.environ.get("APP_URL", ""))),
                      PERMANENT_SESSION_LIFETIME=dt.timedelta(days=SESSION_DAYS),
                      MAX_CONTENT_LENGTH=6 * 1024 * 1024)
    app.register_blueprint(auth_api.blueprint(cfg))
    app.register_blueprint(admin_api.blueprint(cfg))
    app.register_blueprint(api.blueprint(cfg))

    @app.before_request
    def load_context():
        if security.cross_site_write():
            return jsonify(error="This request came from another website, so it was refused.", code="cross_site"), 403
        ctx.load()

    app.after_request(security.harden)

    @app.errorhandler(accounts.AuthError)
    def auth_error(e):
        return jsonify(error=str(e), code=e.code), e.status

    @app.errorhandler(plans.LimitError)
    def limit_error(e):
        return jsonify(error=str(e), code="limit"), 402

    @app.errorhandler(ValueError)
    def bad_value(e):
        return jsonify(error=str(e)), 400

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
        site = sites.get_any(str(payload.get("s", "")))
        if not site or not site.get("track_analytics") or site.get("paused"):
            return Response("", 404, cors)
        ip = security.client_ip()
        analytics.record_hit(cfg["data_dir"], site, payload, ip, request.headers.get("User-Agent", ""))
        return Response("", 204, cors)

    @app.get("/health")
    def health():
        return {"ok": True}

    return app
