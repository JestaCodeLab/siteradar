"""SMS alerts through FlockText (https://api.flocktext.com/api).

Set FLOCKTEXT_API_KEY (Settings -> Developer in FlockText). FLOCKTEXT_SENDER_ID is optional: it must be an approved
sender ID, and FlockText uses the organisation's primary one when it is left out.
Without a key, messages are only logged (nothing is sent and nothing counts against the quota).
"""
import logging
import os
import re
import time

import requests

from . import db, plans

log = logging.getLogger("sitewatch.sms")
BASE = "https://api.flocktext.com/api"


def configured():
    return bool(os.environ.get("FLOCKTEXT_API_KEY"))


def _headers():
    return {"Authorization": "Bearer " + os.environ["FLOCKTEXT_API_KEY"]}


def normalise(phone):
    """International form with a plus sign, e.g. 0241234567 -> +233241234567. Empty when it can't be a phone number."""
    d = re.sub(r"\D", "", phone or "")
    if d.startswith("00"):
        d = d[2:]
    elif d.startswith("0") and len(d) == 10:
        d = "233" + d[1:]
    return "+" + d if len(d) >= 9 else ""


def balance():
    """Credits left in our FlockText wallet, or None when it can't be read."""
    if not configured():
        return None
    try:
        r = requests.get(BASE + "/v1/wallet/balance", headers=_headers(), timeout=15)
        return r.json()["data"]["creditsBalance"] if r.status_code == 200 else None
    except (requests.RequestException, KeyError, ValueError):
        return None


def _send(numbers, message):
    """One call for all numbers. Returns (ok, error text)."""
    body = {"recipients": [{"phone": n} for n in numbers], "message": message}
    if os.environ.get("FLOCKTEXT_SENDER_ID"):
        body["sender_id"] = os.environ["FLOCKTEXT_SENDER_ID"]
    r = requests.post(BASE + "/v1/messages/send", json=body, headers=_headers(), timeout=20)
    if r.status_code in (200, 201):
        return True, ""
    try:
        err = r.json().get("message") or r.text
    except ValueError:
        err = r.text
    if r.status_code == 402:
        log.error("FlockText wallet is out of credits: top it up")
    return False, f"{r.status_code}: {err}"[:200]


def send(ws, message):
    """Text every alert number of a workspace, within its monthly quota. Returns how many were sent."""
    numbers = [n for n in (normalise(p) for p in ws.get("alert_phones") or []) if n]
    left = plans.sms_quota(ws) - plans.sms_used(ws["id"])
    numbers = numbers[:max(left, 0)]
    if not numbers:
        return 0
    message = message[:300]
    if not configured():
        log.warning("SMS (FLOCKTEXT_API_KEY not set, not sent) to=%s: %s", numbers, message)
        return 0
    try:
        ok, err = _send(numbers, message)
    except requests.RequestException as e:
        ok, err = False, str(e)[:200]
    now = time.time()
    for n in numbers:
        db.run("INSERT INTO sms_log(workspace_id, ts, phone, message, ok, error) VALUES (?,?,?,?,?,?)",
               (ws["id"], now, n, message, int(ok), err))
    return len(numbers) if ok else 0
