"""SMS alerts through a Ghana gateway. Pick one with SMS_PROVIDER=arkesel|mnotify and set SMS_API_KEY, SMS_SENDER.

With no provider set, messages are only logged (nothing is sent and nothing counts against the quota).
"""
import logging
import os
import re
import time

import requests

from . import db, plans

log = logging.getLogger("sitewatch.sms")


def configured():
    return bool(os.environ.get("SMS_PROVIDER") and os.environ.get("SMS_API_KEY"))


def normalise(phone):
    """Ghana numbers to international form without '+', e.g. 0241234567 -> 233241234567."""
    d = re.sub(r"\D", "", phone or "")
    if d.startswith("00"):
        d = d[2:]
    if d.startswith("0") and len(d) == 10:
        d = "233" + d[1:]
    return d


def _send(provider, key, sender, number, message):
    if provider == "arkesel":
        r = requests.post("https://sms.arkesel.com/api/v2/sms/send", timeout=15, headers={"api-key": key},
                          json={"sender": sender, "message": message, "recipients": [number]})
        ok = r.status_code < 300 and (r.json().get("status") == "success")
    elif provider == "mnotify":
        r = requests.post("https://api.mnotify.com/api/sms/quick", params={"key": key}, timeout=15,
                          json={"recipient": [number], "sender": sender, "message": message, "is_schedule": False, "schedule_date": ""})
        ok = r.status_code < 300 and r.json().get("status") == "success"
    else:
        raise RuntimeError(f"Unknown SMS_PROVIDER '{provider}'")
    return ok, "" if ok else r.text[:200]


def send(ws, message):
    """Text every alert number of a workspace, within its monthly quota. Returns how many were sent."""
    numbers = [normalise(p) for p in ws.get("alert_phones") or []]
    numbers = [n for n in numbers if n]
    if not numbers:
        return 0
    left = plans.sms_quota(ws) - plans.sms_used(ws["id"])
    sent = 0
    for n in numbers[:max(left, 0)]:
        if not configured():
            log.warning("SMS (no provider configured, not sent) to=%s: %s", n, message)
            continue
        try:
            ok, err = _send(os.environ["SMS_PROVIDER"], os.environ["SMS_API_KEY"], os.environ.get("SMS_SENDER", "SiteWatch"), n, message[:300])
        except Exception as e:
            ok, err = False, str(e)[:200]
        db.run("INSERT INTO sms_log(workspace_id, ts, phone, message, ok, error) VALUES (?,?,?,?,?,?)",
               (ws["id"], time.time(), n, message[:300], int(ok), err))
        sent += ok
    return sent
