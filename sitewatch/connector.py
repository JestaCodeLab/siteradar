"""Connectors: software SiteRadar installs on a customer's website (today the WordPress plugin) so findings can be fixed with a click.

The plugin calls SiteRadar, never the other way round, so the customer's website exposes no way to change it. Each website has its own
connection key. Only a hash of the key is stored here; the key itself is shown once, inside the downloaded plugin."""
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import time
import zipfile

from flask import Blueprint, jsonify, request

from . import db, edits, fixes, netguard, security, sites

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


def probe(site):
    """Asks the website itself whether the plugin is there. The plugin answers a public ping at /wp-json/siteradar/v1/ping.

    -> "alive" (the plugin answered for this website), "gone" (WordPress answered and has no such route, so the plugin is not active)
    or "unknown" (the website could not be read, or blocks the check). Only "gone" is trusted as proof that the plugin was removed."""
    base = str(site["url"]).rstrip("/")
    for url in (f"{base}/wp-json/siteradar/v1/ping", f"{base}/?rest_route=/siteradar/v1/ping"):
        try:
            r = netguard.get(url, timeout=10, stream=True, headers={"User-Agent": "SiteRadar-Connector/1.0", "Accept": "application/json"})
            raw = r.raw.read(100_000, decode_content=True)
            r.close()
            data = json.loads(raw.decode("utf-8", "replace"))
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        if r.status_code == 200 and data.get("ok") and data.get("site_id") == site["id"]:
            return "alive"
        if data.get("code") == "rest_no_route":
            return "gone"
    return "unknown"


def check(site):
    """A live look at whether the plugin is still on the website. Updates what the dashboard shows."""
    result = probe(site)
    c = db.kv_get(f"connector:{site['id']}")
    if c:
        if result == "alive":
            c["last_seen"] = time.time()
        elif result == "gone":
            c["last_seen"], c["info"] = None, {}
            fixes.report(site["id"], [])
        db.kv_set(f"connector:{site['id']}", c)
    return {"result": result, **status(site["id"])}


def nudge(site):
    """Tell the plugin to check in now, so a fix is applied within seconds instead of at the next hourly check. The request carries nothing:
    the plugin fetches what to do from SiteRadar with its own key. Best effort; the hourly check-in is the fallback."""
    base = str(site["url"]).rstrip("/")
    for url in (f"{base}/wp-json/siteradar/v1/nudge", f"{base}/?rest_route=/siteradar/v1/nudge"):
        try:
            r = netguard.post(url, timeout=20, headers={"User-Agent": "SiteRadar-Connector/1.0"})
            if r.status_code == 200:
                return True
        except Exception:
            continue
    return False


def auto_check(site, every=6 * 3600):
    """Looks now and then at websites shown as connected, so a plugin that was deleted stops showing as connected without anyone pressing the button."""
    c = db.kv_get(f"connector:{site['id']}")
    if not c or not c.get("last_seen") or time.time() - c.get("probed", 0) < every:
        return
    c["probed"] = time.time()
    db.kv_set(f"connector:{site['id']}", c)
    check(site)


def latest_version():
    """The version of the plugin that a new download contains, read from the plugin file."""
    try:
        with open(PLUGIN_VERSION_FILE, encoding="utf-8") as f:
            m = re.search(r"^\s*\*\s*Version:\s*([0-9][0-9.]*)", f.read(4000), re.M)
        return m.group(1) if m else None
    except OSError:
        return None


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
        if isinstance(d.get("fixes"), list):          # the fixes the plugin has really switched on
            fixes.report(site["id"], d["fixes"])
        if isinstance(d.get("edit_results"), list):   # what the plugin did with the text changes it was given
            edits.report(site["id"], d["edit_results"])
        return jsonify(ok=True, snippet=True, fixes=fixes.enabled(site["id"]), edits=edits.pending(site["id"]), applied_edits=edits.applied_list(site["id"]))

    @bp.post("/disconnect")
    def disconnect():
        """The plugin was deactivated: the website is no longer connected."""
        site = authed()
        if not site:
            return jsonify(error="Unknown connection."), 401
        c = db.kv_get(f"connector:{site['id']}")
        c.update(last_seen=None, info={})
        db.kv_set(f"connector:{site['id']}", c)
        fixes.report(site["id"], [])          # the plugin is off, so none of its fixes are active any more
        return jsonify(ok=True)

    return bp
