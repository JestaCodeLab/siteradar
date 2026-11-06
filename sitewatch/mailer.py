"""Transactional email through Resend (https://resend.com). Set RESEND_API_KEY and MAIL_FROM.

Without a key the message is written to the log instead, which is how you read verification codes locally.
"""
import base64
import logging
import os

import requests

log = logging.getLogger("sitewatch.mailer")
API = "https://api.resend.com/emails"


def configured():
    return bool(os.environ.get("RESEND_API_KEY"))


def sender():
    return os.environ.get("MAIL_FROM") or "SiteRadar <onboarding@resend.dev>"


def send(to, subject, text, html=None, attachments=(), reply_to=None):
    to = [to] if isinstance(to, str) else [t for t in to if t]
    if not to:
        return False
    if not configured():
        log.warning("EMAIL (Resend not configured, not sent) to=%s subject=%s\n%s", to, subject, text)
        return False
    payload = {"from": sender(), "to": to[:50], "subject": subject, "text": text}
    if html:
        payload["html"] = html
    if reply_to:
        payload["reply_to"] = reply_to
    if attachments:
        payload["attachments"] = [{"filename": n, "content": base64.b64encode(d).decode()} for n, d, _ in attachments]
    try:
        r = requests.post(API, json=payload, headers={"Authorization": "Bearer " + os.environ["RESEND_API_KEY"]}, timeout=20)
        if r.status_code >= 300:
            log.error("Resend rejected the email (%s): %s", r.status_code, r.text[:300])
            return False
        return True
    except requests.RequestException as e:
        log.error("Resend request failed: %s", e)
        return False
