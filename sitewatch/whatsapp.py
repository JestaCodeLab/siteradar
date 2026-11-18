"""WhatsApp alerts through Meta's WhatsApp Business Platform (Cloud API). Send only: nobody can reply.

Set WHATSAPP_TOKEN (a permanent system-user token) and WHATSAPP_PHONE_ID (the sending number's ID). Optional:
WHATSAPP_ALERT_TEMPLATE (default siteradar_alert), WHATSAPP_CODE_TEMPLATE (default siteradar_code), WHATSAPP_LANG (default en),
WHATSAPP_API_VERSION (default v21.0), WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET for the delivery-status webhook.

The two templates must be approved in Meta Business Manager first:
  siteradar_alert (Utility), body:
    SiteRadar alert for {{1}}: {{2}} Manage these alerts in your SiteRadar settings. This number does not receive replies.
  siteradar_code (Authentication), the standard one-time-password template with the copy-code button.
Without a token nothing is sent and the settings screens say WhatsApp is not switched on yet.
"""
import hashlib
import hmac
import logging
import os
import re
import secrets
import time

import requests

from . import db

log = logging.getLogger("sitewatch.whatsapp")
DAILY_CAP = 2                 # down and recovery messages per website in any 24 hours
MAX_PER_SITE = 2              # numbers per website
CODE_MINUTES = 10
TRIES = 5
CODES_PER_NUMBER = 3          # codes any one number may be sent in 24 hours, from all workspaces together
CODES_PER_DAY = 6             # verification codes a workspace may request in 24 hours


class WhatsAppError(Exception):
    pass


def configured():
    return bool(os.environ.get("WHATSAPP_TOKEN") and os.environ.get("WHATSAPP_PHONE_ID"))


def normalise(phone):
    """International form with a plus sign, e.g. 0241234567 -> +233241234567. Empty when it can't be a phone number."""
    d = re.sub(r"\D", "", phone or "")
    if d.startswith("00"):
        d = d[2:]
    elif d.startswith("0") and len(d) == 10:
        d = "233" + d[1:]
    return "+" + d if 9 <= len(d) <= 15 else ""


def mask(phone):
    return phone[:4] + "•" * (len(phone) - 7) + phone[-3:] if len(phone) > 8 else phone


def _post(to, template, components):
    """One template message. Returns (message id, error text)."""
    ver = os.environ.get("WHATSAPP_API_VERSION", "v21.0")
    body = {"messaging_product": "whatsapp", "to": to.lstrip("+"), "type": "template",
            "template": {"name": template, "language": {"code": os.environ.get("WHATSAPP_LANG", "en")}, "components": components}}
    try:
        r = requests.post(f"https://graph.facebook.com/{ver}/{os.environ['WHATSAPP_PHONE_ID']}/messages", json=body,
                          headers={"Authorization": "Bearer " + os.environ["WHATSAPP_TOKEN"]}, timeout=20)
    except requests.RequestException as e:
        return None, str(e)[:200]
    if r.status_code in (200, 201):
        try:
            return r.json()["messages"][0]["id"], ""
        except (KeyError, IndexError, ValueError):
            return "", ""
    try:
        err = r.json()["error"].get("message") or r.text
    except (KeyError, ValueError, AttributeError):
        err = r.text
    return None, f"{r.status_code}: {err}"[:200]


def _clean(text, n):
    """Template variables cannot hold line breaks or long runs of spaces."""
    return re.sub(r"\s+", " ", text or "").strip()[:n] or "-"


# ---- numbers and verification -------------------------------------------------------

def _hash(phone, code):
    key = (os.environ.get("TOKEN_KEY") or os.environ.get("SECRET_KEY") or "siteradar").encode()
    return hmac.new(key, f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def numbers(ws_id):
    return {r["phone"]: r for r in db.q("SELECT * FROM whatsapp_numbers WHERE workspace_id=?", (ws_id,))}


def send_code(ws_id, phone):
    """Text a six-digit code to a number the customer has just added. Raises WhatsAppError with a message they can read."""
    if not configured():
        raise WhatsAppError("WhatsApp alerts are not switched on yet. Please try again later.")
    row = db.q1("SELECT * FROM whatsapp_numbers WHERE workspace_id=? AND phone=?", (ws_id, phone))
    if not row:
        raise WhatsAppError("That number has not been added.")
    if row["verified_at"]:
        return
    now = time.time()
    if row["code_sent"] and now - row["code_sent"] < 60:
        raise WhatsAppError("A code was sent a moment ago. Wait a minute before asking for another.")
    if db.q1("SELECT COUNT(*) n FROM whatsapp_log WHERE workspace_id=? AND kind='code' AND ts>?", (ws_id, now - 86400))["n"] >= CODES_PER_DAY:
        raise WhatsAppError("Too many codes were requested today. Try again tomorrow.")
    if db.q1("SELECT COUNT(*) n FROM whatsapp_log WHERE phone=? AND kind='code' AND ts>?", (phone, now - 86400))["n"] >= CODES_PER_NUMBER:
        raise WhatsAppError("That number has been sent several codes today. Try again tomorrow.")
    code = f"{secrets.randbelow(10 ** 6):06d}"
    wamid, err = _post(phone, os.environ.get("WHATSAPP_CODE_TEMPLATE", "siteradar_code"),
                       [{"type": "body", "parameters": [{"type": "text", "text": code}]},
                        {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": code}]}])
    db.run("INSERT INTO whatsapp_log(workspace_id, ts, phone, kind, ok, error, wamid) VALUES (?,?,?,?,?,?,?)",
           (ws_id, now, phone, "code", int(wamid is not None), err or None, wamid))
    if wamid is None:
        db.run("UPDATE whatsapp_numbers SET last_error=? WHERE workspace_id=? AND phone=?", (err, ws_id, phone))
        log.error("WhatsApp code not sent to %s: %s", phone, err)
        raise WhatsAppError("We could not send a code to that number. Check it is a WhatsApp number and try again.")
    db.run("UPDATE whatsapp_numbers SET code_hash=?, code_expires=?, attempts=0, code_sent=?, last_error=NULL WHERE workspace_id=? AND phone=?",
           (_hash(phone, code), now + CODE_MINUTES * 60, now, ws_id, phone))


def confirm(ws_id, phone, code):
    row = db.q1("SELECT * FROM whatsapp_numbers WHERE workspace_id=? AND phone=?", (ws_id, phone))
    if not row:
        raise WhatsAppError("That number has not been added.")
    if row["verified_at"]:
        return
    code = re.sub(r"\D", "", code or "")
    if not row["code_hash"] or time.time() > (row["code_expires"] or 0):
        raise WhatsAppError("That code has expired. Ask for a new one.")
    # Counting the try and checking the limit is one statement, so parallel guesses cannot all slip under the limit.
    if not db.q1("UPDATE whatsapp_numbers SET attempts=attempts+1 WHERE workspace_id=? AND phone=? AND attempts<? RETURNING attempts", (ws_id, phone, TRIES)):
        raise WhatsAppError("Too many wrong tries. Ask for a new code.")
    if not hmac.compare_digest(row["code_hash"], _hash(phone, code)):
        raise WhatsAppError("That code is not right.")
    db.run("UPDATE whatsapp_numbers SET verified_at=?, code_hash=NULL WHERE workspace_id=? AND phone=?", (time.time(), ws_id, phone))


def set_site_numbers(cfg, ws, user, site, phones, consent):
    """Choose which numbers get this website's alerts. New numbers need the opt-in tick and start verification.

    Returns a list of problems (per number) that did not stop the site from being saved.
    """
    import json
    from . import sites
    clean, problems = [], []
    for p in phones or []:
        n = normalise(p)
        if not n:
            raise ValueError(f"{p} is not a phone number. Use the international form, like +233 24 123 4567.")
        if n not in clean:
            clean.append(n)
    if len(clean) > MAX_PER_SITE:
        raise ValueError(f"A website can send WhatsApp alerts to {MAX_PER_SITE} numbers.")
    known = numbers(ws["id"])
    fresh = [n for n in clean if n not in known]
    if fresh and not consent:
        raise ValueError("Tick the box to confirm this number's owner agrees to get alerts on WhatsApp.")
    for n in fresh:
        db.run("INSERT INTO whatsapp_numbers(workspace_id, phone, consent_user, consent_at) VALUES (?,?,?,?)", (ws["id"], n, user["id"], time.time()))
    db.run("UPDATE sites SET whatsapp=? WHERE id=?", (json.dumps(clean), site["id"]))
    sites.refresh(cfg)
    for n in clean:
        row = db.q1("SELECT verified_at, code_sent FROM whatsapp_numbers WHERE workspace_id=? AND phone=?", (ws["id"], n))
        if not row["verified_at"] and not row["code_sent"]:
            try:
                send_code(ws["id"], n)
            except WhatsAppError as e:
                problems.append(str(e))
    return problems


def remove_number(cfg, ws_id, phone):
    """Stops WhatsApp alerts to this number everywhere in the workspace (this is how people opt out)."""
    import json
    from . import sites
    db.run("DELETE FROM whatsapp_numbers WHERE workspace_id=? AND phone=?", (ws_id, phone))
    for s in db.q("SELECT id, whatsapp FROM sites WHERE workspace_id=?", (ws_id,)):
        cur = json.loads(s["whatsapp"] or "[]")
        if phone in cur:
            db.run("UPDATE sites SET whatsapp=? WHERE id=?", (json.dumps([x for x in cur if x != phone]), s["id"]))
    sites.refresh(cfg)


def site_status(ws_id, site):
    known = numbers(ws_id)
    items = [{"phone": p, "masked": mask(p), "verified": bool(known.get(p, {}).get("verified_at")), "known": p in known} for p in site.get("whatsapp") or []]
    return {"enabled": configured(), "cap": DAILY_CAP, "max": MAX_PER_SITE, "numbers": items,
            "pending": any(i["known"] and not i["verified"] for i in items)}


# ---- alerts -------------------------------------------------------------------------

def alert(ws, site, event, text):
    """WhatsApp a website's down or recovery alert to its verified numbers. Returns (messages sent, reason it was held back).

    At most DAILY_CAP messages per website in any 24 hours to keep costs predictable; the email still goes. A recovery is only sent
    when we told them it was down, so nobody is left thinking a site is still down.
    """
    if event not in ("down", "up") or not text:
        return 0, ""
    known = numbers(ws["id"])
    to = [p for p in site.get("whatsapp") or [] if known.get(p, {}).get("verified_at")]
    if not to:
        return 0, ""
    if not configured():
        log.warning("WhatsApp (not configured, not sent) to=%s: %s", to, text)
        return 0, ""
    now = time.time()
    used = db.q1("SELECT COUNT(DISTINCT ts) n FROM whatsapp_log WHERE site_id=? AND kind IN ('down','up') AND ok=1 AND ts>?", (site["id"], now - 86400))["n"]
    if event == "down" and used >= DAILY_CAP:
        return 0, "limit"
    if event == "up":
        last = db.q1("SELECT kind FROM whatsapp_log WHERE site_id=? AND kind IN ('down','up') AND ok=1 ORDER BY ts DESC LIMIT 1", (site["id"],))
        if not last or last["kind"] != "down":
            return 0, ""
    sent = 0
    for p in to:
        wamid, err = _post(p, os.environ.get("WHATSAPP_ALERT_TEMPLATE", "siteradar_alert"),
                           [{"type": "body", "parameters": [{"type": "text", "text": _clean(site["name"], 60)},
                                                            {"type": "text", "text": _clean(text, 200)}]}])
        db.run("INSERT INTO whatsapp_log(workspace_id, site_id, ts, phone, kind, ok, error, wamid) VALUES (?,?,?,?,?,?,?,?)",
               (ws["id"], site["id"], now, p, event, int(wamid is not None), err or None, wamid))
        sent += wamid is not None
    return sent, ""


def send_test(phone, template="alert", text=""):
    """Admin-only: one real template message to any number, to check the setup. Returns a dict with what Meta answered.
    Logged as kind 'test' with no workspace, so it never counts toward a customer's limits."""
    if not configured():
        raise WhatsAppError("Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID first.")
    phone = normalise(phone)
    if not phone:
        raise WhatsAppError("Enter the number with its country code, for example +233241234567.")
    if template == "code":
        name = os.environ.get("WHATSAPP_CODE_TEMPLATE", "siteradar_code")
        code = f"{secrets.randbelow(10 ** 6):06d}"     # a throwaway code, not stored: it only proves the template works
        comps = [{"type": "body", "parameters": [{"type": "text", "text": code}]},
                 {"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": code}]}]
    else:
        name = os.environ.get("WHATSAPP_ALERT_TEMPLATE", "siteradar_alert")
        comps = [{"type": "body", "parameters": [{"type": "text", "text": "Test website"},
                                                 {"type": "text", "text": _clean(text, 200) if text else "This is a test alert from SiteRadar. Your WhatsApp setup works."}]}]
    wamid, err = _post(phone, name, comps)
    db.run("INSERT INTO whatsapp_log(workspace_id, ts, phone, kind, ok, error, wamid) VALUES (?,?,?,?,?,?,?)",
           (None, time.time(), phone, "test", int(wamid is not None), err or None, wamid))
    return {"ok": wamid is not None, "error": err, "template": name, "phone": phone, "wamid": wamid}


def record_status(wamid, status, error=""):
    """Meta tells us afterwards whether a message was delivered, read or failed."""
    if wamid and status:
        db.run("UPDATE whatsapp_log SET status=?, error=COALESCE(NULLIF(?,''), error) WHERE wamid=?", (status, error, wamid))


def valid_signature(raw, header):
    secret = os.environ.get("WHATSAPP_APP_SECRET")
    if not secret:
        return False
    want = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(want, header or "")
