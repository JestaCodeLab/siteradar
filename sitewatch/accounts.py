"""Users, workspaces, team membership, invitations and email verification codes."""
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time

from werkzeug.security import check_password_hash, generate_password_hash as _gen

from . import db, emails, mailer, netguard, plans, storage

log = logging.getLogger("sitewatch.accounts")
CODE_MINUTES = 15
INVITE_DAYS = 7
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
RANK = {"viewer": 0, "member": 1, "admin": 2, "owner": 3}


def generate_password_hash(pw):
    return _gen(pw, method="pbkdf2:sha256:600000")      # scrypt is missing from some Python builds


class AuthError(ValueError):
    def __init__(self, message, code="auth", status=401):
        super().__init__(message)
        self.code, self.status = code, status


# ---- helpers --------------------------------------------------------------

def norm_email(email):
    email = (email or "").strip().lower()
    if not EMAIL_RE.match(email):
        raise ValueError("Enter a valid email address.")
    return email


def public_user(u):
    return {"id": u["id"], "pending_email": u.get("pending_email"), "email": u["email"], "first_name": u["first_name"], "last_name": u["last_name"],
            "phone": u["phone"], "country": u.get("country"), "is_super": bool(u["is_super"]), "email_verified": bool(u["email_verified"])}


def user_by_email(email):
    return db.q1("SELECT * FROM users WHERE lower(email)=lower(?)", (email,))


def user_by_id(uid):
    return db.q1("SELECT * FROM users WHERE id=?", (uid,))


def super_emails():
    return {e.strip().lower() for e in os.environ.get("SUPER_ADMIN_EMAILS", "").split(",") if e.strip()}


def _validate_password(pw):
    if len(pw or "") < 8:
        raise ValueError("Use at least 8 characters for your password.")
    if pw.lower() in ("password", "12345678", "qwertyui", "password1"):
        raise ValueError("That password is too easy to guess. Choose a different one.")


# ---- registration and codes -----------------------------------------------

def ghana_phone(raw):
    """+233XXXXXXXXX for a Ghana number written any usual way, otherwise None."""
    d = re.sub(r"\D", "", raw or "")
    local = d[3:] if d.startswith("233") else d[1:] if d.startswith("0") else d
    return "+233" + local if re.fullmatch(r"\d{9}", local) else None


def register(data, country=None):
    """country is the two-letter code we detected from the request, if any. Only Ghana signups give a phone number."""
    email = norm_email(data.get("email"))
    first, last = (data.get("first_name") or "").strip(), (data.get("last_name") or "").strip()
    if not first or not last:
        raise ValueError("Enter your first and last name.")
    country = (country or "").upper()[:2] or None
    phone = ""
    if country == "GH":
        phone = ghana_phone(data.get("phone"))
        if not phone:
            raise ValueError("Enter a Ghana phone number, for example 024 123 4567.")
    _validate_password(data.get("password"))
    existing = user_by_email(email)
    if existing and existing["email_verified"]:
        raise AuthError("An account with this email already exists. Log in instead.", "exists", 409)
    pw = generate_password_hash(data["password"])
    if existing:     # started signing up before but never verified: let them try again
        db.run("UPDATE users SET first_name=?, last_name=?, phone=?, country=?, password_hash=? WHERE id=?",
               (first, last, phone, country, pw, existing["id"]))
        uid = existing["id"]
    else:
        uid = db.run("INSERT INTO users(email, first_name, last_name, phone, country, password_hash, created) VALUES (?,?,?,?,?,?,?)",
                     (email, first, last, phone, country, pw, time.time()))
    send_code(user_by_id(uid), "verify")
    return user_by_id(uid)


def _hash_code(uid, purpose, code):
    return hmac.new(f"{uid}:{purpose}".encode(), code.encode(), hashlib.sha256).hexdigest()


def send_code(user, purpose, to=None):
    """Email a 6-digit code. At most one a minute and five an hour per person."""
    now = time.time()
    recent = db.q("SELECT created FROM email_codes WHERE user_id=? AND purpose=? AND created>? ORDER BY created DESC",
                  (user["id"], purpose, now - 3600))
    if recent and now - recent[0]["created"] < 60:
        raise AuthError("Please wait a minute before asking for another code.", "rate", 429)
    if len(recent) >= 5:
        raise AuthError("Too many codes requested. Try again in an hour.", "rate", 429)
    db.exec("UPDATE email_codes SET used=1 WHERE user_id=? AND purpose=?", (user["id"], purpose))
    code = f"{secrets.randbelow(1000000):06d}"
    db.run("INSERT INTO email_codes(user_id, purpose, code_hash, created, expires) VALUES (?,?,?,?,?)",
           (user["id"], purpose, _hash_code(user["id"], purpose, code), now, now + CODE_MINUTES * 60))
    mail = (emails.reset_code if purpose == "reset" else emails.verify_code)(user["first_name"], code, CODE_MINUTES)
    mailer.send(to or user["email"], mail.subject, mail.text, mail.html)


def check_code(user, purpose, code):
    row = db.q1("SELECT * FROM email_codes WHERE user_id=? AND purpose=? AND used=0 ORDER BY created DESC LIMIT 1",
                (user["id"], purpose))
    code = re.sub(r"\D", "", code or "")
    if not row or row["expires"] < time.time():
        raise AuthError("That code has expired. Ask for a new one.", "expired", 400)
    if row["attempts"] >= 5:
        raise AuthError("Too many wrong attempts. Ask for a new code.", "locked", 429)
    db.exec("UPDATE email_codes SET attempts=attempts+1 WHERE id=?", (row["id"],))
    if not hmac.compare_digest(row["code_hash"], _hash_code(user["id"], purpose, code)):
        raise AuthError("That code is not right. Check it and try again.", "bad_code", 400)
    db.exec("UPDATE email_codes SET used=1 WHERE id=?", (row["id"],))


def send_welcome(user):
    """The first email after an account is confirmed. Never lets a mail problem get in the way of signing in."""
    try:
        mail = emails.welcome(user["first_name"])
        mailer.send(user["email"], mail.subject, mail.text, mail.html)
    except Exception:
        log.exception("Welcome email failed for user %s", user["id"])


def verify_email(email, code):
    user = user_by_email(norm_email(email)) or raise_(AuthError("That code is not right.", "bad_code", 400))
    first_time = not user["email_verified"]
    check_code(user, "verify", code)
    sets = f"email_verified=1, last_login={time.time()}"
    if user["email"].lower() in super_emails():
        sets += ", is_super=1"
    db.exec(f"UPDATE users SET {sets} WHERE id=?", (user["id"],))
    if first_time:
        send_welcome(user)
    return user_by_id(user["id"])


def raise_(e):
    raise e


def login(email, password):
    user = user_by_email((email or "").strip())
    if not user or not check_password_hash(user["password_hash"], password or ""):
        raise AuthError("Wrong email or password.", "bad_login", 401)
    if user["disabled"]:
        raise AuthError("This account has been disabled. Contact support.", "disabled", 403)
    if not user["email_verified"]:
        send_code_safe(user)
        raise AuthError("Verify your email to continue. We sent you a new code.", "unverified", 403)
    db.exec("UPDATE users SET last_login=? WHERE id=?", (time.time(), user["id"]))
    return user


def google_user(profile, country=None):
    """The user for a verified Google profile: found by Google id or email, or created. Returns (user, created)."""
    if not profile.get("email_verified"):
        raise AuthError("Google says this email address is not verified.", "google_unverified", 403)
    sub, email = str(profile["sub"]), norm_email(profile.get("email"))
    user = db.q1("SELECT * FROM users WHERE google_sub=?", (sub,)) or user_by_email(email)
    created = False
    if not user:
        first = (profile.get("given_name") or email.split("@")[0]).strip()[:60]
        last = (profile.get("family_name") or "").strip()[:60]
        uid = db.run("INSERT INTO users(email, first_name, last_name, phone, country, password_hash, email_verified, google_sub, created) VALUES (?,?,?,?,?,?,?,?,?)",
                     (email, first, last, "", (country or "").upper()[:2] or None, generate_password_hash(secrets.token_urlsafe(32)), 1, sub, time.time()))
        user, created = user_by_id(uid), True
        send_welcome(user)
    else:
        if user["disabled"]:
            raise AuthError("This account has been disabled. Contact support.", "disabled", 403)
        if not user["email_verified"]:     # Google has proven the address, so whatever password was set at sign-up is void
            db.exec("UPDATE users SET email_verified=1, password_hash=? WHERE id=?", (generate_password_hash(secrets.token_urlsafe(32)), user["id"]))
        if not user.get("google_sub"):
            db.exec("UPDATE users SET google_sub=? WHERE id=?", (sub, user["id"]))
    db.exec("UPDATE users SET last_login=? WHERE id=?", (time.time(), user["id"]))
    return user_by_id(user["id"]), created


def send_code_safe(user):
    try:
        send_code(user, "verify")
    except AuthError:
        pass


def request_reset(email):
    user = user_by_email((email or "").strip())
    if user and user["email_verified"] and not user["disabled"]:
        try:
            send_code(user, "reset")
        except AuthError:
            pass          # same answer either way, so the form can't be used to find out who has an account


def reset_password(email, code, new_password):
    user = user_by_email((email or "").strip()) or raise_(AuthError("That code is not right.", "bad_code", 400))
    _validate_password(new_password)
    check_code(user, "reset", code)
    db.exec("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(new_password), user["id"]))


def change_password(user, current, new):
    if not check_password_hash(user["password_hash"], current or ""):
        raise ValueError("Your current password is not right.")
    _validate_password(new)
    db.exec("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(new), user["id"]))


def request_email_change(user, new_email, password):
    new = norm_email(new_email)
    if new == user["email"].lower():
        raise ValueError("That is already your email address.")
    if not check_password_hash(user["password_hash"], password or ""):
        raise AuthError("Your password is not right.", "bad_login", 403)
    if user_by_email(new):
        raise ValueError("Another account already uses that email address.")
    db.exec("UPDATE users SET pending_email=? WHERE id=?", (new, user["id"]))
    send_code(user, "email", to=new)
    return new


def confirm_email_change(user, code):
    fresh = user_by_id(user["id"])
    if not fresh["pending_email"]:
        raise ValueError("There is no email change waiting for a code.")
    check_code(fresh, "email", code)
    if user_by_email(fresh["pending_email"]):
        raise ValueError("Another account already uses that email address.")
    db.exec("UPDATE users SET email=?, pending_email=NULL WHERE id=?", (fresh["pending_email"], user["id"]))
    return user_by_id(user["id"])


def logout_others(user):
    """Signs the person out everywhere except the browser that asks (it takes the new version number)."""
    db.exec("UPDATE users SET session_ver=session_ver+1 WHERE id=?", (user["id"],))
    return user_by_id(user["id"])["session_ver"]


# ---- what each person wants to be alerted about ----------------------------------------
ALERT_EVENTS = [
    ("down", "A website goes down", "After two failed checks"), ("up", "A website is back up", "With how long it was down"),
    ("slow", "A website is slow", "Three slow checks in a row"), ("ssl", "SSL certificate expiring", "From 21 days before"),
    ("domain", "Domain expiring", "60, 30, 14, 7, 3 and 1 days before"), ("dns", "DNS records changed", "Web server, name servers, mail, SPF, DMARC"),
    ("report", "Monthly report ready", "Sent on the 1st"),
]


def get_prefs(user):
    saved = json.loads(user.get("alert_prefs") or "{}")
    return {k: {"email": saved.get(k, {}).get("email", True), "sms": saved.get(k, {}).get("sms", True)} for k, _, _ in ALERT_EVENTS}


def set_prefs(user, prefs):
    clean = {k: {"email": bool((prefs.get(k) or {}).get("email", True)), "sms": bool((prefs.get(k) or {}).get("sms", True))} for k, _, _ in ALERT_EVENTS}
    db.exec("UPDATE users SET alert_prefs=? WHERE id=?", (json.dumps(clean), user["id"]))
    return clean


def filter_emails(emails, event):
    """Drop addresses belonging to people who turned this kind of email off. Unknown addresses always get it."""
    if not event:
        return emails
    out = []
    for e in emails:
        u = user_by_email(e)
        if u and not get_prefs(u)[event]["email"]:
            continue
        out.append(e)
    return out


def filter_phones(phones, event):
    if not event:
        return phones
    out = []
    for p in phones:
        digits = re.sub(r"\D", "", p)[-9:]
        u = db.q1("SELECT * FROM users WHERE right(regexp_replace(phone, '\\D', '', 'g'), 9)=?", (digits,)) if len(digits) == 9 else None
        if u and not get_prefs(u)[event]["sms"]:
            continue
        out.append(p)
    return out


def update_profile(user, data):
    sets, args = [], []
    for f in ("first_name", "last_name"):
        if f in data:
            v = str(data[f] or "").strip()
            if not v:
                raise ValueError("Names can't be empty.")
            sets.append(f"{f}=?"); args.append(v[:60])
    if "phone" in data:
        sets.append("phone=?"); args.append(re.sub(r"[^\d+]", "", data["phone"] or ""))
    if sets:
        db.run(f"UPDATE users SET {', '.join(sets)} WHERE id=?", (*args, user["id"]))
    return user_by_id(user["id"])


# ---- workspaces -----------------------------------------------------------

def _ws(r):
    if not r:
        return None
    w = dict(r)
    for f in ("alert_emails", "alert_phones", "alert_webhooks"):
        w[f] = json.loads(w.get(f) or "[]")
    for f in ("onboarded", "suspended", "comped"):
        w[f] = bool(w[f])
    w["limits_override"] = json.loads(w.get("limits_override") or "{}")
    return w


def workspace(ws_id):
    return _ws(db.q1("SELECT * FROM workspaces WHERE id=?", (ws_id,))) if ws_id else None


def memberships(user_id):
    rows = db.q("""SELECT w.*, m.role FROM memberships m JOIN workspaces w ON w.id=m.workspace_id
                   WHERE m.user_id=? AND w.deleted_at IS NULL ORDER BY m.created""", (user_id,))
    return [_ws(r) for r in rows]


def site_access(user_id, ws_id):
    """None when the person can see every website, else the list of website ids they were given."""
    r = db.q1("SELECT site_access FROM memberships WHERE user_id=? AND workspace_id=?", (user_id, ws_id))
    return json.loads(r["site_access"]) if r and r["site_access"] else None


def clean_access(ws_id, ids):
    """Keep only websites that belong to this workspace. Empty or None means all websites."""
    if not ids:
        return None
    have = {r["id"] for r in db.q("SELECT id FROM sites WHERE workspace_id=?", (ws_id,))}
    keep = [i for i in ids if i in have]
    if not keep:
        raise ValueError("Choose at least one website, or give access to all websites.")
    return json.dumps(keep)


def role_in(user_id, ws_id):
    r = db.q1("SELECT role FROM memberships WHERE user_id=? AND workspace_id=?", (user_id, ws_id))
    return r["role"] if r else None


COMPANY_FIELDS = ("name", "website", "industry", "size", "country", "phone", "address", "timezone")


def create_workspace(user, data):
    name = (data.get("name") or "").strip()
    if not name:
        raise ValueError("Enter your company name.")
    now = time.time()
    country = data.get("country") or "Ghana"
    ws_id = db.run("""INSERT INTO workspaces(name, website, industry, size, country, phone, address, owner_id, alert_emails, created, currency, plan_id, plan_status)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?,'freelance','none')""",
                   (name[:120], (data.get("website") or "").strip()[:200], data.get("industry"), data.get("size"),
                    country, (data.get("phone") or user["phone"] or "")[:30],
                    (data.get("address") or "")[:300], user["id"], json.dumps([user["email"]]), now, plans.currency_for_country(country)))
    db.exec("INSERT INTO memberships(workspace_id, user_id, role, created) VALUES (?,?,?,?)", (ws_id, user["id"], "owner", now))
    return workspace(ws_id)


def update_workspace(ws_id, data):
    sets, args = [], []
    for f in COMPANY_FIELDS:
        if f in data:
            v = str(data[f] or "").strip()
            if f == "name" and not v:
                raise ValueError("Enter your company name.")
            sets.append(f"{f}=?"); args.append(v[:300])
    if "alert_emails" in data:
        emails = [norm_email(e) for e in (data["alert_emails"] or [])][:10]
        sets.append("alert_emails=?"); args.append(json.dumps(emails))
    if "alert_phones" in data:
        phones = [re.sub(r"[^\d+]", "", p) for p in (data["alert_phones"] or []) if p][:5]
        sets.append("alert_phones=?"); args.append(json.dumps(phones))
    if "alert_webhooks" in data:
        hooks = [h.strip() for h in (data["alert_webhooks"] or []) if netguard.chat_webhook_ok(str(h).strip())][:5]
        sets.append("alert_webhooks=?"); args.append(json.dumps(hooks))
    if str(data.get("country") or "").strip():        # the billing currency follows the country until the workspace has paid for something
        w = workspace(ws_id)
        if w and not w["paystack_auth"] and not db.q1("SELECT 1 FROM payments WHERE workspace_id=? AND status='success'", (ws_id,)):
            sets.append("currency=?"); args.append(plans.currency_for_country(str(data["country"] or "")))
    if sets:
        db.run(f"UPDATE workspaces SET {', '.join(sets)} WHERE id=?", (*args, ws_id))
    return workspace(ws_id)


def _owner_name(ws):
    o = user_by_id(ws["owner_id"]) if ws.get("owner_id") else None
    return f"{o['first_name']} {o['last_name']}".strip() if o else None


def public_workspace(ws, role=None):
    plan = plans.limits(ws)
    u = plans.usage(ws["id"])
    return {
        "id": ws["id"], "name": ws["name"], "owner_name": _owner_name(ws), "website": ws["website"], "industry": ws["industry"], "size": ws["size"],
        "country": ws["country"], "phone": ws["phone"], "address": ws["address"], "logo_url": ws["logo_url"],
        "timezone": ws.get("timezone") or "Africa/Accra", "logo_name": ws.get("logo_name"), "logo_size": ws.get("logo_size"),
        "role": role, "onboarded": ws["onboarded"], "suspended": ws["suspended"], "alerts_prompted": bool(ws.get("alerts_prompted")), "currency": ws.get("currency") or "GHS", "coupon": ({"code": ws["coupon_code"], "left": ws.get("coupon_left")} if ws.get("coupon_code") else None), "report_day": ws.get("report_day") or 1, "report_at": ws.get("report_at") or "08:00",
        "plan": {"id": plan["id"], "name": plan["name"], "sites": plan["sites"], "members": plan["members"], "storage_mb": plan["storage_mb"],
                 "interval_minutes": plan["interval_minutes"], "sms": plan["sms"],
                 "history_months": plan["history_months"], "channels": plan["channels"],
                 "client_access": plan["client_access"]},
        "sms_credits": ws.get("sms_bonus") or 0, "plan_id": ws["plan_id"], "cycle": ws["cycle"], "plan_status": ws["plan_status"], "locked": plans.is_locked(ws), "cancels": bool(ws.get("cancels")), "plan_renews": ws["plan_renews"],
        "usage": u,
    }


# ---- team -----------------------------------------------------------------

def team(ws_id):
    members = db.q("""SELECT u.id, u.email, u.first_name, u.last_name, u.last_login, m.role, m.created, m.site_access
                      FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.created""", (ws_id,))
    invites = db.q("""SELECT id, email, role, created, expires, site_access FROM invitations
                      WHERE workspace_id=? AND accepted IS NULL AND expires>? ORDER BY created DESC""", (ws_id, time.time()))
    for r in members + invites:
        r["site_access"] = json.loads(r["site_access"]) if r["site_access"] else None
    return {"members": members, "invites": invites}


def invite(ws, inviter, email, role, site_ids=None):
    email = norm_email(email)
    if role not in ("admin", "member", "viewer"):
        raise ValueError("Choose a role: Admin, Member or Viewer.")
    if RANK[role] >= RANK[role_in(inviter["id"], ws["id"]) or "viewer"]:
        raise AuthError("You can only invite people with a lower role than yours.", "forbidden", 403)
    existing = user_by_email(email)
    if existing and role_in(existing["id"], ws["id"]):
        raise ValueError("That person is already on your team.")
    if db.q1("SELECT 1 FROM invitations WHERE workspace_id=? AND lower(email)=? AND accepted IS NULL AND expires>?",
             (ws["id"], email, time.time())):
        raise ValueError("That person already has a pending invitation.")
    plans.check_can_add_seat(ws, role)
    if site_ids and not plans.limits(ws)["client_access"]:
        raise plans.LimitError("Limiting someone to chosen websites is part of the Growth plan and above.")
    access = clean_access(ws["id"], site_ids)
    token = secrets.token_urlsafe(32)
    db.run("INSERT INTO invitations(workspace_id, email, role, token_hash, invited_by, created, expires, site_access) VALUES (?,?,?,?,?,?,?,?)",
           (ws["id"], email, role, hashlib.sha256(token.encode()).hexdigest(), inviter["id"], time.time(),
            time.time() + INVITE_DAYS * 86400, access))
    send_invite_email(ws, inviter, email, role, token)
    return token


def send_invite_email(ws, inviter, email, role, token):
    base = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
    url = f"{base}/invite/{token}"
    who = f"{inviter['first_name']} {inviter['last_name']}".strip()
    mail = emails.invite(ws["name"], who, role, url, INVITE_DAYS, email)
    mailer.send(email, mail.subject, mail.text, mail.html)


def _invite_row(token):
    return db.q1("SELECT * FROM invitations WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))


def invite_info(token):
    inv = _invite_row(token)
    if not inv or inv["accepted"] or inv["expires"] < time.time():
        raise AuthError("This invitation has expired or was already used. Ask for a new one.", "invite_invalid", 410)
    ws = workspace(inv["workspace_id"])
    inviter = user_by_id(inv["invited_by"])
    return {"email": inv["email"], "role": inv["role"], "workspace": ws["name"], "logo_url": ws["logo_url"],
            "inviter": f"{inviter['first_name']} {inviter['last_name']}".strip() if inviter else "",
            "has_account": bool(user_by_email(inv["email"]))}


def accept_invite(token, user=None, data=None):
    """Join the workspace. A new person sets a name and password; being sent the link proves they own the email."""
    inv = _invite_row(token)
    if not inv or inv["accepted"] or inv["expires"] < time.time():
        raise AuthError("This invitation has expired or was already used. Ask for a new one.", "invite_invalid", 410)
    if user is None:
        user = user_by_email(inv["email"])
        if user is None:
            data = data or {}
            first, last = (data.get("first_name") or "").strip(), (data.get("last_name") or "").strip()
            if not first or not last:
                raise ValueError("Enter your first and last name.")
            _validate_password(data.get("password"))
            uid = db.run("""INSERT INTO users(email, first_name, last_name, phone, password_hash, email_verified, created)
                            VALUES (?,?,?,?,?,1,?)""",
                         (inv["email"], first, last, re.sub(r"[^\d+]", "", data.get("phone") or ""),
                          generate_password_hash(data["password"]), time.time()))
            user = user_by_id(uid)
        elif not check_password_hash(user["password_hash"], (data or {}).get("password") or ""):
            raise AuthError("Log in with your existing password to accept.", "bad_login", 401)
    elif user["email"].lower() != inv["email"].lower():
        raise AuthError(f"This invitation was sent to {inv['email']}. Log in with that address.", "wrong_user", 403)
    if not user["email_verified"]:
        db.exec("UPDATE users SET email_verified=1 WHERE id=?", (user["id"],))
    if not role_in(user["id"], inv["workspace_id"]):
        db.exec("INSERT INTO memberships(workspace_id, user_id, role, created, site_access) VALUES (?,?,?,?,?)",
                (inv["workspace_id"], user["id"], inv["role"], time.time(), inv["site_access"]))
    db.exec("UPDATE invitations SET accepted=? WHERE id=?", (time.time(), inv["id"]))
    return user_by_id(user["id"]), inv["workspace_id"]


def resend_invite(ws, inviter, invite_id):
    inv = db.q1("SELECT * FROM invitations WHERE id=? AND workspace_id=? AND accepted IS NULL", (invite_id, ws["id"]))
    if not inv:
        raise ValueError("That invitation no longer exists.")
    token = secrets.token_urlsafe(32)
    db.exec("UPDATE invitations SET token_hash=?, expires=? WHERE id=?",
            (hashlib.sha256(token.encode()).hexdigest(), time.time() + INVITE_DAYS * 86400, invite_id))
    send_invite_email(ws, inviter, inv["email"], inv["role"], token)


def cancel_invite(ws_id, invite_id):
    db.exec("DELETE FROM invitations WHERE id=? AND workspace_id=?", (invite_id, ws_id))


def set_role(ws, actor_id, user_id, role, site_ids=False):
    if role not in ("admin", "member", "viewer"):
        raise ValueError("Choose a role: Admin, Member or Viewer.")
    target = role_in(user_id, ws["id"])
    if not target:
        raise ValueError("That person is not on your team.")
    if target == "owner":
        raise AuthError("The owner's role can't be changed.", "forbidden", 403)
    if role == "viewer" and not plans.limits(ws)["client_access"]:
        raise plans.LimitError("Client viewer access is part of the Growth plan and above.")
    db.exec("UPDATE memberships SET role=? WHERE workspace_id=? AND user_id=?", (role, ws["id"], user_id))
    if site_ids is not False:
        db.exec("UPDATE memberships SET site_access=? WHERE workspace_id=? AND user_id=?", (clean_access(ws["id"], site_ids), ws["id"], user_id))


def remove_member(ws, actor_id, user_id):
    target = role_in(user_id, ws["id"])
    if target == "owner":
        raise AuthError("The owner can't be removed.", "forbidden", 403)
    if target is None:
        raise ValueError("That person is not on your team.")
    if target == "admin" and role_in(actor_id, ws["id"]) != "owner":
        raise AuthError("Only the owner can remove an admin.", "forbidden", 403)
    db.exec("DELETE FROM memberships WHERE workspace_id=? AND user_id=?", (ws["id"], user_id))


# ---- bootstrap -------------------------------------------------------------

def bootstrap(cfg):
    """Create the first super admin from ADMIN_EMAIL / ADMIN_PASSWORD (or promote that email if it already exists)."""
    email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    if not email:
        return
    admin = user_by_email(email)
    if not admin and os.environ.get("ADMIN_PASSWORD"):
        db.run("""INSERT INTO users(email, first_name, last_name, phone, password_hash, email_verified, is_super, created)
                  VALUES (?,?,?,?,?,1,1,?)""",
               (email, os.environ.get("ADMIN_FIRST_NAME", "Admin"), os.environ.get("ADMIN_LAST_NAME", ""), "",
                generate_password_hash(os.environ["ADMIN_PASSWORD"]), time.time()))
        log.info("Created super admin %s", email)
    elif admin and not admin["is_super"]:
        db.exec("UPDATE users SET is_super=1, email_verified=1 WHERE id=?", (admin["id"],))


# ---- deleting a workspace ----------------------------------------------------------------

DELETE_DAYS = 30


def delete_workspace(ws_id):
    """Hide the workspace and stop monitoring now. Its data is removed for good after DELETE_DAYS."""
    db.exec("UPDATE workspaces SET deleted_at=?, suspended=1, plan_status='lapsed' WHERE id=?", (time.time(), ws_id))
    db.exec("UPDATE workspaces SET paystack_auth=NULL, paystack_card=NULL WHERE id=?", (ws_id,))


SITE_DATA_TABLES = ("checks", "incidents", "hits", "audits", "alerts_sent", "domain_checks", "dns_snapshots", "sitemap_snapshots")


def _remove_files(pattern):
    """Delete every stored file whose key matches the regular expression. Anchored patterns only: a loose one could reach another customer's files."""
    n = 0
    for r in db.q("SELECT key FROM assets WHERE key ~ ?", (pattern,)):
        storage.remove(r["key"])
        n += 1
    return n


def _wipe_workspace(ws_id):
    """Remove everything a workspace owns: websites and their history, subscriptions, invoices, stored files, the team and invitations.
    Payment records and the admin audit trail stay (accounting). Returns what was removed, for the audit trail."""
    site_ids = [r["id"] for r in db.q("SELECT id FROM sites WHERE workspace_id=?", (ws_id,))]
    out = {"websites": len(site_ids), "files": 0}
    if site_ids:
        for table in SITE_DATA_TABLES:
            db.exec(f"DELETE FROM {table} WHERE site_id = ANY(?)", (site_ids,))
        for sid in site_ids:
            e = re.escape(sid)
            out["files"] += _remove_files(rf"^shot/{e}-(desktop|mobile)\.jpg$") + _remove_files(rf"^report/{e}-[0-9]{{4}}-[0-9]{{2}}\.(html|pdf)$")
    out["files"] += _remove_files(rf"^report/subscriptions-{ws_id}-[0-9]{{4}}-[0-9]{{2}}\.(html|pdf)$")
    invoices = db.q("SELECT i.filename FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id WHERE s.workspace_id=?", (ws_id,))
    for r in invoices:
        storage.remove("invoice/" + r["filename"])
    out["invoices"] = len(invoices)
    out["files"] += len(invoices)
    db.exec("DELETE FROM invoices WHERE subscription_id IN (SELECT id FROM subscriptions WHERE workspace_id=?)", (ws_id,))
    out["subscriptions"] = db.q1("SELECT COUNT(*) n FROM subscriptions WHERE workspace_id=?", (ws_id,))["n"]
    members = [r["user_id"] for r in db.q("SELECT user_id FROM memberships WHERE workspace_id=?", (ws_id,))]
    for t in ("subscriptions", "sites", "memberships", "invitations", "sms_log"):
        db.exec(f"DELETE FROM {t} WHERE workspace_id=?", (ws_id,))
    db.exec("DELETE FROM kv WHERE key LIKE ?", (f"renewal-notice:{ws_id}:%",))
    storage.remove(f"logo/{ws_id}")
    out["people"] = _remove_orphaned_users(members)
    return out


def _remove_orphaned_users(user_ids):
    """Delete the accounts of people who no longer belong to any workspace. Super admins and people who are in another workspace stay."""
    n = 0
    for uid in user_ids:
        u = user_by_id(uid)
        if not u or u["is_super"] or db.q1("SELECT 1 FROM memberships WHERE user_id=?", (uid,)):
            continue
        for t in ("email_codes", "login_tickets"):
            db.exec(f"DELETE FROM {t} WHERE user_id=?", (uid,))
        db.exec("DELETE FROM users WHERE id=?", (uid,))
        n += 1
    return n


def _tombstone(ws_id):
    """What is left of a removed workspace: an empty shell, so payment records and the audit trail still point at something."""
    db.exec("""UPDATE workspaces SET name='[deleted]', owner_id=NULL, logo_url=NULL, website='', phone='', address='', alert_emails='[]', alert_phones='[]',
               alert_webhooks='[]', paystack_auth=NULL, paystack_card=NULL, paystack_email=NULL, suspended=1, plan_status='lapsed',
               deleted_at=COALESCE(deleted_at, ?) WHERE id=?""", (time.time(), ws_id))


def erase_workspace(cfg, ws_id):
    """Super admin: delete a customer now, with all its data. Returns what was removed."""
    from . import sites
    ws = workspace(ws_id)
    if not ws or ws["name"] == "[deleted]":
        raise ValueError("This customer has already been deleted.")
    if db.q1("SELECT 1 FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? AND u.is_super=1", (ws_id,)):
        raise ValueError("A super admin belongs to this workspace, so it cannot be deleted from here.")
    out = _wipe_workspace(ws_id)
    db.exec("DELETE FROM admin_audit WHERE workspace_id=? AND action='note'", (ws_id,))       # internal notes about the customer
    _tombstone(ws_id)
    sites.refresh(cfg)
    return out


def purge_deleted():
    """Remove everything belonging to workspaces deleted more than DELETE_DAYS ago (payment records stay for accounting)."""
    for w in db.q("SELECT id FROM workspaces WHERE deleted_at IS NOT NULL AND deleted_at<? AND name != '[deleted]'", (time.time() - DELETE_DAYS * 86400,)):
        _wipe_workspace(w["id"])
        _tombstone(w["id"])
