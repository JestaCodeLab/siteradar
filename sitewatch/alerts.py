"""Send alerts by email (SMTP) and/or webhook (Slack, Microsoft Teams, Discord, or any URL)."""
import logging
import smtplib
import ssl
from email.message import EmailMessage

import requests

from . import accounts, mailer, plans, sms

log = logging.getLogger("sitewatch.alerts")


def send_email(cfg, to, subject, text, html=None, attachments=()):
    if mailer.configured():
        return mailer.send(to, subject, text, html, attachments)
    smtp = (cfg.get("alerts") or {}).get("email") or {}
    if not smtp.get("host") or not to:
        log.info("Email not configured; would have sent: %s", subject)
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp.get("from") or smtp.get("username")
    msg["To"] = ", ".join(to if isinstance(to, list) else [to])
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    for name, data, mime in attachments:
        maintype, subtype = mime.split("/")
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=name)
    port = int(smtp.get("port", 587))
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(smtp["host"], port, context=ssl.create_default_context(), timeout=30)
        else:
            server = smtplib.SMTP(smtp["host"], port, timeout=30)
            server.starttls(context=ssl.create_default_context())
        if smtp.get("username"):
            server.login(smtp["username"], smtp.get("password", ""))
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:  # never let an alert failure crash monitoring
        log.error("Email send failed: %s", e)
        return False


def send_webhook(url, text):
    if not url:
        return False
    if "office.com" in url or "webhook.office" in url:      # Microsoft Teams
        payload = {"text": text}
    elif "discord.com" in url:
        payload = {"content": text}
    else:                                                    # Slack and generic
        payload = {"text": text}
    try:
        requests.post(url, json=payload, timeout=10).raise_for_status()
        return True
    except Exception as e:
        log.error("Webhook failed: %s", e)
        return False


def notify(cfg, site, subject, text, sms_text=None):
    """Tell the site's workspace about it: email always, chat webhooks and SMS when the plan includes them.

    `sms_text` is only passed for outages and recoveries, so text messages are kept for what matters.
    """
    ws = accounts.workspace(site.get("workspace_id"))
    if not ws:
        log.warning("ALERT (no workspace) %s | %s", subject, text.replace("\n", " "))
        return False
    plan = plans.limits(ws)
    to = list(dict.fromkeys(ws["alert_emails"] + list(site.get("alert_to") or [])))
    sent = False
    if to:
        sent |= send_email(cfg, to, subject, text)
    if "chat" in plan["channels"]:
        for url in ws["alert_webhooks"]:
            sent |= send_webhook(url, f"*{subject}*\n{text}")
    if sms_text and "sms" in plan["channels"]:
        sent |= bool(sms.send(ws, sms_text))
    log.warning("ALERT %s | %s", subject, text.replace("\n", " "))
    return sent
