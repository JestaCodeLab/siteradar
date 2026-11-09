"""The emails SiteRadar sends, as (subject, plain text, HTML) triples.

Layouts live in templates/email. Each function here picks the template, fills in the words and the plain-text twin
that mail apps show when they cannot display HTML. Sending is done by mailer.send().
"""
import datetime as dt
import os
import re
from collections import namedtuple

from jinja2 import Environment, FileSystemLoader, select_autoescape

Mail = namedtuple("Mail", "subject text html")

_env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), "templates")),
                   autoescape=select_autoescape(["html"]), trim_blocks=True, lstrip_blocks=True)

ROLE_NOTES = {
    "owner": "Owners have full control of the workspace.",
    "admin": "Admins can manage websites, alerts and the team.",
    "member": "Members can add and manage websites.",
    "viewer": "Viewers can see dashboards and reports.",
}


def app_url():
    return os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")


def _common():
    base = app_url()
    return {
        "app_url": base,
        # mail apps need a public image address, so locally (plain http) the name is shown instead of the logo
        "logo_url": f"{base}/logos/siteradar-logo-horizontal.png" if base.startswith("https://") else "",
        "support_email": os.environ.get("SUPPORT_EMAIL") or os.environ.get("CONTACT_TO", "").split(",")[0].strip(),
        "company_name": os.environ.get("COMPANY_NAME", "Jesta Digital Solutions"),
        "company_address": os.environ.get("COMPANY_ADDRESS", ""),
        "year": dt.date.today().year,
    }


def _render(template, subject, **ctx):
    return _env.get_template(f"email/{template}.html").render(subject=subject, **_common(), **ctx)


def fmt_date(value):
    """'2026-12-04' (or a date) as '4 December 2026'."""
    d = value if isinstance(value, dt.date) else dt.date.fromisoformat(str(value)[:10])
    return f"{d.day} {d:%B %Y}"


def _text(*parts):
    """Plain-text body from paragraphs; empty parts are skipped."""
    return "\n\n".join(p.strip() for p in parts if p and p.strip()) + "\n\n-- SiteRadar · See everything. Stay ahead.\n"


# ---- accounts -------------------------------------------------------------------------------

def verify_code(first_name, code, minutes=15):
    subject = f"{code} is your SiteRadar verification code"
    text = _text(f"Hi {first_name or 'there'}, enter this code to confirm your email address:", code,
                 f"It expires in {minutes} minutes. If you did not create a SiteRadar account, ignore this email.")
    return Mail(subject, text, _render("verify", subject, first_name=first_name, code=code, minutes=minutes))


def reset_code(first_name, code, minutes=15):
    subject = f"{code} is your SiteRadar password reset code"
    when = dt.datetime.now().strftime("%d %B %Y, %H:%M")
    text = _text(f"Hi {first_name or 'there'}, enter this code to choose a new password:", code,
                 f"It expires in {minutes} minutes. If you did not ask for this, ignore this email and your password stays as it is.")
    return Mail(subject, text, _render("reset", subject, first_name=first_name, code=code, minutes=minutes, request_time=when))


def welcome(first_name):
    subject = f"Welcome to SiteRadar, {first_name}" if first_name else "Welcome to SiteRadar"
    add = app_url() + "/websites/new"
    text = _text(f"Your radar is ready, {first_name or 'there'}.",
                 "Add your first website and SiteRadar starts checking it straight away: uptime, SSL, domain and DNS, speed and more.",
                 f"Add your first website: {add}")
    return Mail(subject, text, _render("welcome", subject, first_name=first_name, add_url=add))


def invite(workspace, who, role, url, days, email):
    subject = f"{who} invited you to {workspace} on SiteRadar"
    text = _text(f"{who} invited you to join {workspace} on SiteRadar as {role}. {ROLE_NOTES.get(role, '')}",
                 f"Accept the invitation: {url}", f"The link works for {days} days. If you do not know {who}, ignore this email.")
    return Mail(subject, text, _render("invite", subject, workspace=workspace, who=who, role=role, role_note=ROLE_NOTES.get(role, ""),
                                       url=url, days=days, email=email))


# ---- billing --------------------------------------------------------------------------------

def payment_received(first_name, workspace, plan, cycle, amount, method, reference, paid_on, renews, discount=None):
    subject = f"Payment received: SiteRadar {plan}"
    billing = app_url() + "/billing"
    rows = [("Plan", f"{plan} ({cycle})")] + ([("Discount", discount)] if discount else []) + [
        ("Amount paid", amount), ("Paid with", method), ("Reference", reference, True), ("Date", paid_on), ("Next renewal", renews)]
    text = _text(f"Hi {first_name or 'there'}, we received your payment for {workspace}.",
                 "\n".join(f"{r[0]}: {r[1]}" for r in rows),
                 f"Billing and invoices: {billing}")
    return Mail(subject, text, _render("payment_received", subject, first_name=first_name, workspace=workspace, plan=plan, cycle=cycle,
                                       amount=amount, method=method, reference=reference, paid_on=paid_on, renews=renews, rows=rows, billing_url=billing))


def billing_notice(tone, first_name, workspace, plan, renews=None, amount=None, grace_days=7):
    """tone: 'soon' (renewal coming up), 'due' (payment did not go through), 'ended' (plan ended, workspace locked)."""
    billing = app_url() + "/settings?tab=billing"
    rows = [("Plan", plan)]
    if renews:
        rows.append(("Renewal date" if tone == "soon" else "Period ended", renews))
    if amount:
        rows.append(("Amount", amount))
    c = {
        "soon": dict(subject="Your SiteRadar plan renews soon", headline=f"Your {plan} plan renews soon",
                     message="your plan renews in a few days. Open Billing to pay for the next period by card, so there is no break in service.",
                     note="", button="Pay for the next period"),
        "due": dict(subject="Payment needed to keep your SiteRadar plan", headline="We could not take your payment",
                    message=f"we could not take payment for your {plan} plan. Open Billing to pay by card and keep your plan.",
                    note=f"Your plan stays active for {grace_days} days while you sort this out. After that the workspace becomes read-only and monitoring pauses. Nothing is deleted.",
                    button="Update payment"),
        "ended": dict(subject="Your SiteRadar plan has ended", headline="Your plan has ended",
                      message="we could not renew your plan, so your workspace is now read-only and monitoring has paused. Your data is safe, and choosing a plan again restores everything.",
                      note="", button="Choose a plan"),
    }[tone]
    text = _text(f"Hi {first_name or 'there'}, {c['message']}", c["note"], f"{c['button']}: {billing}")
    return Mail(c["subject"], text, _render("billing_notice", c["subject"], tone=tone, first_name=first_name, workspace=workspace,
                                            headline=c["headline"], message=c["message"], note=c["note"], rows=rows,
                                            billing_url=billing, button_label=c["button"]))


# ---- expiry alerts --------------------------------------------------------------------------

def _tone(days):
    return "bad" if days is not None and days <= 14 else "warn"


def expiry(kind, workspace, name, days, expires, url, **extra):
    """kind: 'ssl', 'domain' or 'subscription'. `days` may be negative (already expired)."""
    gone = days is not None and days < 0
    tone = "bad" if gone else _tone(days)
    label = {"ssl": "SSL certificate", "domain": "Domain", "subscription": "Subscription"}[kind]
    if gone:
        big, caption = f"{abs(days)} d", "ago. It has expired."
    else:
        big, caption = (f"{days} d", "left") if days is not None else ("Soon", "")
    if kind == "ssl":
        headline = f"The SSL certificate for {name} expires in {days} days" if not gone else f"The SSL certificate for {name} has expired"
        message = "When a certificate expires, browsers show visitors a security warning and many will leave."
        rows = [("Website", name), ("Expires on", expires)]
        advice = "Renew or reissue the certificate with your host or provider. Many hosts renew it for you if you ask."
        button = "Open website"
    elif kind == "domain":
        headline = f"The domain {name} expires in {days} days" if not gone else f"The domain {name} has expired"
        message = "If a domain lapses, the website and every email address on it stop working."
        rows = [("Domain", name), ("Expires on", expires), ("Registrar", extra.get("registrar") or "Unknown")]
        advice = f"Renew it with {extra.get('registrar') or 'your registrar'} and switch on auto-renew."
        button = "Open website"
    else:
        headline = f"{name} renews in {days} days" if days else f"{name} renews today"
        message = "A subscription you track in SiteRadar is coming up for renewal."
        rows = [("Subscription", name), ("Website", extra.get("site") or "None linked"), ("Renews on", expires), ("Amount", extra.get("amount") or "-"),
                ("Renewal", "Charged automatically" if extra.get("auto_renew") else "Manual: you need to renew it")]
        advice = "" if extra.get("auto_renew") else "Renew it before the date so nothing stops working."
        button = "Open subscriptions"
        tone = "warn" if not gone and (days or 0) > 3 else "bad"
    subject = headline
    text = _text(headline, message, "\n".join(f"{k}: {v}" for k, v in rows), f"What to do: {advice}" if advice else "", f"{button}: {url}")
    return Mail(subject, text, _render("expiry", subject, kind=kind, kind_label=label, tone=tone, workspace=workspace, headline=headline,
                                       message=message, big=big, caption=caption, rows=rows, advice=advice, url=url, button_label=button))


# ---- monitoring alerts ----------------------------------------------------------------------

_ALERT_STYLE = {   # event -> (label, tone)
    "down": ("Website down", "bad"), "up": ("Back up", "ok"), "slow": ("Slow response", "warn"),
    "dns": ("DNS change", "warn"), "domain": ("Domain alert", "warn"), "ssl": ("SSL alert", "warn"),
}


def alert(workspace, subject, text, event=None, site=None):
    """Any monitoring message that has no layout of its own. The plain text is also what chat apps and SMS-style channels get."""
    label, tone = _ALERT_STYLE.get(event or "", ("Alert", "info"))
    url, lines = "", []
    for ln in (text or "").splitlines():
        m = re.match(r"\s*Dashboard:\s*(\S+)", ln)
        if m:
            url = m.group(1)
        elif ln.strip():
            lines.append(ln.strip())
    if site and site.get("id") and not url:
        url = f"{app_url()}/websites/{site['id']}"
    rows = [("Website", site["name"]), ("Address", site["url"])] if site and site.get("name") and site.get("url") else []
    headline = re.sub(r"^(DOWN|RECOVERED|SLOW):\s*", "", subject)
    if event == "up":
        headline = f"{headline.replace(' is back up', '')} is back up"
    elif event == "down":
        headline = f"{headline} is down"
    elif event == "slow":
        headline = f"{headline.replace(' is responding slowly', '')} is responding slowly"
    full = _text(subject, text)
    return Mail(subject, full, _render("alert", subject, tone=tone, label=label, workspace=workspace, headline=headline, lines=lines, rows=rows,
                                       url=url, button_label="Open website" if site and site.get("id") else "Open dashboard"))
