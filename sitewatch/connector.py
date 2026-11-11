"""Connectors: software SiteRadar installs on a customer's website (today the WordPress plugin) so findings can be fixed with a click.

The plugin calls SiteRadar, never the other way round, so the customer's website exposes no way to change it. Each website has its own
connection key. Only a hash of the key is stored here; the key itself is shown once, inside the downloaded plugin."""
import hashlib
import hmac
import io
import json
import os
import secrets
import time
import zipfile

from flask import Blueprint, jsonify, request

from . import db, security, sites

PLUGIN_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "plugin", "wordpress")
PLUGIN_VERSION_FILE = os.path.join(PLUGIN_DIR, "siteradar.php")


def _hash(key):
    return hashlib.sha256(key.encode()).hexdigest()


def issue_key(site_id):
    """A new connection key for the website. Any plugin using the old key stops being accepted."""
    key = "srk_" + secrets.token_urlsafe(32)
    old = db.kv_get(f"connector:{site_id}") or {}
    db.kv_set(f"connector:{site_id}", {"hash": _hash(key), "created": time.time(), "last_seen": old.get("last_seen"), "info": old.get("info") or {}})
    return key


def status(site_id):
    c = db.kv_get(f"connector:{site_id}")
    if not c:
        return {"issued": False, "connected": False, "last_seen": None, "info": {}}
    return {"issued": True, "connected": bool(c.get("last_seen")), "last_seen": c.get("last_seen"), "info": c.get("info") or {}}


def plugin_zip(cfg, site):
    """The plugin as a zip, with this website's connection details inside (siteradar-connection.php), ready to upload to WordPress."""
    key = issue_key(site["id"])
    api = str(cfg.get("public_url") or os.environ.get("PUBLIC_URL") or "").rstrip("/")
    conn = "<?php\n// Created by SiteRadar for this website. Do not share this file: the key lets the plugin report to your SiteRadar account.\nif ( ! defined( 'ABSPATH' ) ) { exit; }\nreturn " \
           + "array( 'api' => %s, 'site_id' => %s, 'key' => %s );\n" % tuple(_php(v) for v in (api, site["id"], key))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(PLUGIN_DIR):
            for name in files:
                full = os.path.join(root, name)
                z.write(full, os.path.join("siteradar", os.path.relpath(full, PLUGIN_DIR)))
        z.writestr("siteradar/siteradar-connection.php", conn)
    return buf.getvalue()


def _php(value):
    return "'" + str(value).replace("\\", "\\\\").replace("'", "\\'") + "'"


def blueprint(cfg):
    bp = Blueprint("connector", __name__, url_prefix="/api/connector")

    def authed():
        """The website the plugin speaks for, from `Authorization: Bearer <site id>.<key>`; None when the key is wrong."""
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        site_id, _, key = token.partition(".")
        if not site_id or not key or len(token) > 200:
            return None
        saved = db.kv_get(f"connector:{site_id}")
        if not saved or not hmac.compare_digest(saved["hash"], _hash(key)):
            return None
        return sites.get_any(site_id)

    @bp.post("/heartbeat")
    def heartbeat():
        """The plugin says it is alive and what it runs on. The answer tells it what to do (for now: whether to add the tracking snippet)."""
        if security.limited("connector-hb", 10, 30, key=request.headers.get("Authorization", "")[:60] or security.client_ip()):
            return jsonify(error="Too many requests."), 429
        site = authed()
        if not site:
            return jsonify(error="Unknown connection. Download the plugin again from SiteRadar."), 401
        d = request.get_json(silent=True) or {}
        info = {k: str(d.get(k) or "")[:60] for k in ("plugin_version", "wp_version", "php_version", "seo_plugin", "snippet")}
        c = db.kv_get(f"connector:{site['id']}")
        c.update(last_seen=time.time(), info=info)
        db.kv_set(f"connector:{site['id']}", c)
        return jsonify(ok=True, snippet=True)

    return bp
