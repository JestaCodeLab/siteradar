"""Transactional email through Resend (https://resend.com). Set RESEND_API_KEY and MAIL_FROM.

Without a key the message is written to the log instead, which is how you read verification codes locally.
"""
import base64
import html as _html
import logging
import os

import requests

log = logging.getLogger("sitewatch.mailer")
API = "https://api.resend.com/emails"


def configured():
    return bool(os.environ.get("RESEND_API_KEY"))


def sender():
    return os.environ.get("MAIL_FROM") or "SiteWatch <onboarding@resend.dev>"


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


def layout(heading, body, button=None, footer="You are receiving this because of your SiteWatch account."):
    """Plain, responsive email shell. `body` is already-safe HTML."""
    btn = ""
    if button:
        label, url = button
        btn = (f'<p style="margin:28px 0"><a href="{_html.escape(url)}" style="background:#1F4FD8;color:#fff;text-decoration:none;'
               f'font-weight:600;padding:13px 22px;border-radius:8px;display:inline-block">{_html.escape(label)}</a></p>')
    return f"""<!doctype html><html><body style="margin:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#12151C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #E2E5EA">
<tr><td style="padding:28px 32px 8px;font-size:15px;font-weight:700;color:#1F4FD8">SiteWatch</td></tr>
<tr><td style="padding:0 32px 8px"><h1 style="font-size:22px;margin:8px 0 12px">{_html.escape(heading)}</h1>
<div style="font-size:15px;line-height:1.6;color:#3F4857">{body}</div>{btn}</td></tr>
<tr><td style="padding:16px 32px 28px;font-size:12px;color:#8A93A3">{_html.escape(footer)}</td></tr>
</table></td></tr></table></body></html>"""


def code_email(first_name, code, minutes=15):
    body = (f"<p>Hi {_html.escape(first_name or 'there')}, use this code to verify your email address.</p>"
            f'<p style="font-size:34px;letter-spacing:8px;font-weight:700;font-family:monospace;margin:18px 0;color:#12151C">{code}</p>'
            f"<p>It expires in {minutes} minutes. If you did not create a SiteWatch account, ignore this email.</p>")
    return (f"Your SiteWatch code is {code}\n\nIt expires in {minutes} minutes.",
            layout("Verify your email", body))
