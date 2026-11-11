"""Send alerts by email (SMTP) and/or webhook (Slack, Microsoft Teams, Discord, or any URL)."""
import logging
import smtplib
import ssl
from email.message import EmailMessage

import requests

from . import accounts, emails, mailer, netguard, plans, push, sms

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
        if not netguard.chat_webhook_ok(url):
            log.error("Webhook refused: %s is not a Slack or Teams address", url[:60])
            return False
        netguard.post(url, json=payload, timeout=10, allow_redirects=False).raise_for_status()
        return True
    except Exception as e:
        log.error("Webhook failed: %s", e)
        return False


def notify(cfg, site, subject, text, sms_text=None, event=None, mail=None):
    """Tell the site's workspace about it: email always, chat webhooks and SMS when the plan includes them.

    `sms_text` is only passed for outages and recoveries, so text messages are kept for what matters.
    `mail` is a ready-made emails.Mail for alerts with their own layout (expiry warnings); every other alert gets the general one.
    """
    ws = accounts.workspace(site.get("workspace_id"))
    if not ws:
        log.warning("ALERT (no workspace) %s | %s", subject, text.replace("\n", " "))
        return False
    plan = plans.limits(ws)
    to = accounts.filter_emails(list(dict.fromkeys(ws["alert_emails"] + list(site.get("alert_to") or []))), event)
    sent = False
    if to:
        mail = mail or emails.alert(ws["name"], subject, text, event, site)
        sent |= send_email(cfg, to, mail.subject, mail.text, mail.html)
    if "chat" in plan["channels"]:
        for url in ws["alert_webhooks"]:
            sent |= send_webhook(url, f"*{subject}*\n{text}")
    if sms_text and "sms" in plan["channels"]:
        sent |= bool(sms.send({**ws, "alert_phones": accounts.filter_phones(ws["alert_phones"], event)}, sms_text))
    sent |= bool(_browser(ws, site, event, subject, text))
    log.warning("ALERT %s | %s", subject, text.replace("\n", " "))
    return sent


PUSH_PAGES = {"renewal": "/subscriptions", "report": "/reports"}


def _browser(ws, site, event, subject, text):
    """Browser notification to the team's installed apps and browsers. Never lets a push problem stop the other alerts."""
    try:
        url = PUSH_PAGES.get(event) or (f"/websites/{site['id']}" if site.get("id") else "/overview")
        body = next((line.strip() for line in text.splitlines() if line.strip()), subject)[:180]
        return push.notify(ws["id"], site, event, subject, body, url)
    except Exception:
        log.exception("Browser notification failed")
        return 0
