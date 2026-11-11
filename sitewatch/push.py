"""Browser notifications (Web Push) for people who installed SiteRadar as an app or allowed notifications in their browser.

Each device that allows notifications is saved as a subscription. When an alert is raised, every subscribed team member who has push
turned on for that kind of alert gets it. Needs a VAPID key pair in the environment (create one with `python -m sitewatch vapid`)."""
import base64
import json
import logging
import os
import time

from flask import Blueprint, g, jsonify, request

from . import accounts, db, security
from .ctx import workspace_required

log = logging.getLogger("sitewatch.push")


def _keys():
    return os.environ.get("VAPID_PUBLIC_KEY", "").strip(), os.environ.get("VAPID_PRIVATE_KEY", "").strip()


def enabled():
    return all(_keys())


def generate_keys():
    """A new VAPID key pair as (public, private), both URL-safe base64. Keep the private one secret."""
    from cryptography.hazmat.primitives import serialization
    from py_vapid import Vapid
    v = Vapid()
    v.generate_keys()
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    private = b64(v.private_key.private_numbers().private_value.to_bytes(32, "big"))
    public = b64(v.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint))
    return public, private


def save(user, ws_id, sub, agent):
    """Remember a device. `sub` is the browser's PushSubscription as JSON."""
    endpoint = str(sub.get("endpoint") or "")
    keys = sub.get("keys") or {}
    if not endpoint.startswith("https://") or len(endpoint) > 1000 or not keys.get("p256dh") or not keys.get("auth"):
        raise ValueError("That notification setup was not valid. Please try again.")
    db.exec("""INSERT INTO push_subscriptions(user_id, workspace_id, endpoint, p256dh, auth, agent, created)
               VALUES (?,?,?,?,?,?,?)
               ON CONFLICT (endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, workspace_id=EXCLUDED.workspace_id,
               p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth, agent=EXCLUDED.agent""",
            (user["id"], ws_id, endpoint, str(keys["p256dh"])[:200], str(keys["auth"])[:100], (agent or "")[:200], time.time()))


def remove(user_id, endpoint):
    db.exec("DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?", (endpoint, user_id))


def _send(row, payload):
    from pywebpush import WebPushException, webpush
    try:
        webpush(subscription_info={"endpoint": row["endpoint"], "keys": {"p256dh": row["p256dh"], "auth": row["auth"]}},
                data=json.dumps(payload), vapid_private_key=_keys()[1],
                vapid_claims={"sub": os.environ.get("VAPID_SUBJECT") or "mailto:" + (os.environ.get("CONTACT_EMAIL") or "support@siteradar.com")},
                ttl=3600, timeout=10)
        return True
    except WebPushException as e:
        status = getattr(e.response, "status_code", None)
        if status in (404, 410):          # the person removed the permission or uninstalled the app
            db.exec("DELETE FROM push_subscriptions WHERE id=?", (row["id"],))
        else:
            log.warning("Push to a device failed (%s): %s", status, e)
    except Exception as e:
        log.warning("Push failed: %s", e)
    return False


def notify(ws_id, site, event, title, body, url):
    """Send one alert to every device of the workspace's members who want it. Returns how many devices it reached."""
    if not enabled() or not ws_id:
        return 0
    rows = db.q("""SELECT s.*, u.alert_prefs FROM push_subscriptions s JOIN users u ON u.id = s.user_id
                   WHERE s.workspace_id=? AND u.disabled=0""", (ws_id,))
    sent = 0
    for r in rows:
        member = db.q1("SELECT role FROM memberships WHERE workspace_id=? AND user_id=?", (ws_id, r["user_id"]))
        if not member:
            continue
        want = (json.loads(r["alert_prefs"] or "{}").get(event) or {}).get("push", True) if event else True
        if not want:
            continue
        if site and site.get("id") and member["role"] in ("member", "viewer"):
            allowed = accounts.site_access(r["user_id"], ws_id)
            if allowed is not None and site["id"] not in allowed:
                continue
        sent += _send(r, {"title": title, "body": body, "url": url, "tag": f"{event or 'alert'}:{(site or {}).get('id', '')}"})
    return sent


def blueprint(cfg):
    bp = Blueprint("push", __name__, url_prefix="/api/push")

    @bp.before_request
    def guard():
        return workspace_required(lambda: None)()

    @bp.get("/config")
    def config():
        return jsonify(enabled=enabled(), public_key=_keys()[0] if enabled() else None)

    @bp.post("/subscribe")
    def subscribe():
        if not enabled():
            return jsonify(error="Notifications are not switched on for this server yet."), 503
        if security.limited("push-subscribe", 10, 20, key=str(g.user["id"])):
            return jsonify(error="Too many attempts. Wait a few minutes and try again."), 429
        save(g.user, g.ws["id"], (request.get_json(silent=True) or {}).get("subscription") or {}, request.headers.get("User-Agent"))
        return jsonify(ok=True)

    @bp.post("/unsubscribe")
    def unsubscribe():
        remove(g.user["id"], str((request.get_json(silent=True) or {}).get("endpoint") or ""))
        return jsonify(ok=True)

    @bp.post("/test")
    def test():
        """Send a notification to this person's devices so they can see it works."""
        rows = db.q("SELECT * FROM push_subscriptions WHERE user_id=? AND workspace_id=?", (g.user["id"], g.ws["id"]))
        sent = sum(_send(r, {"title": "SiteRadar notifications are on", "body": "You will see alerts like this when a website goes down or a certificate is about to expire.", "url": "/overview", "tag": "test"}) for r in rows) if enabled() else 0
        return jsonify(sent=sent)

    return bp
