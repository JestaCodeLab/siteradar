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

from . import db, mailer, plans

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
    return {"id": u["id"], "email": u["email"], "first_name": u["first_name"], "last_name": u["last_name"],
            "phone": u["phone"], "is_super": bool(u["is_super"]), "email_verified": bool(u["email_verified"])}


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

def register(data):
    email = norm_email(data.get("email"))
    first, last = (data.get("first_name") or "").strip(), (data.get("last_name") or "").strip()
    if not first or not last:
        raise ValueError("Enter your first and last name.")
    phone = re.sub(r"[^\d+]", "", data.get("phone") or "")
    if len(re.sub(r"\D", "", phone)) < 9:
        raise ValueError("Enter a valid phone number.")
    _validate_password(data.get("password"))
    existing = user_by_email(email)
    if existing and existing["email_verified"]:
        raise AuthError("An account with this email already exists. Log in instead.", "exists", 409)
    pw = generate_password_hash(data["password"])
    if existing:     # started signing up before but never verified: let them try again
        db.run("UPDATE users SET first_name=?, last_name=?, phone=?, password_hash=? WHERE id=?",
               (first, last, phone, pw, existing["id"]))
        uid = existing["id"]
    else:
        uid = db.run("INSERT INTO users(email, first_name, last_name, phone, password_hash, created) VALUES (?,?,?,?,?,?)",
                     (email, first, last, phone, pw, time.time()))
    send_code(user_by_id(uid), "verify")
    return user_by_id(uid)


def _hash_code(uid, purpose, code):
    return hmac.new(f"{uid}:{purpose}".encode(), code.encode(), hashlib.sha256).hexdigest()


def send_code(user, purpose):
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
    text, html = mailer.code_email(user["first_name"], code, CODE_MINUTES)
    if purpose == "reset":
        text = f"Your SiteWatch password reset code is {code}\n\nIt expires in {CODE_MINUTES} minutes."
        html = html.replace("Verify your email", "Reset your password")
    mailer.send(user["email"], f"{code} is your SiteWatch code", text, html)


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


def verify_email(email, code):
    user = user_by_email(norm_email(email)) or raise_(AuthError("That code is not right.", "bad_code", 400))
    check_code(user, "verify", code)
    sets = "email_verified=1"
    if user["email"].lower() in super_emails():
        sets += ", is_super=1"
    db.exec(f"UPDATE users SET {sets} WHERE id=?", (user["id"],))
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
    return w


def workspace(ws_id):
    return _ws(db.q1("SELECT * FROM workspaces WHERE id=?", (ws_id,))) if ws_id else None


def memberships(user_id):
    rows = db.q("""SELECT w.*, m.role FROM memberships m JOIN workspaces w ON w.id=m.workspace_id
                   WHERE m.user_id=? ORDER BY m.created""", (user_id,))
    return [_ws(r) for r in rows]


def role_in(user_id, ws_id):
    r = db.q1("SELECT role FROM memberships WHERE user_id=? AND workspace_id=?", (user_id, ws_id))
    return r["role"] if r else None


COMPANY_FIELDS = ("name", "website", "industry", "size", "country", "phone", "address")


def create_workspace(user, data):
    name = (data.get("name") or "").strip()
    if not name:
        raise ValueError("Enter your company name.")
    now = time.time()
    ws_id = db.run("""INSERT INTO workspaces(name, website, industry, size, country, phone, address, owner_id, alert_emails, created)
                      VALUES (?,?,?,?,?,?,?,?,?,?)""",
                   (name[:120], (data.get("website") or "").strip()[:200], data.get("industry"), data.get("size"),
                    data.get("country") or "Ghana", (data.get("phone") or user["phone"] or "")[:30],
                    (data.get("address") or "")[:300], user["id"], json.dumps([user["email"]]), now))
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
        hooks = [h.strip() for h in (data["alert_webhooks"] or []) if str(h).startswith("https://")][:5]
        sets.append("alert_webhooks=?"); args.append(json.dumps(hooks))
    if sets:
        db.run(f"UPDATE workspaces SET {', '.join(sets)} WHERE id=?", (*args, ws_id))
    return workspace(ws_id)


def public_workspace(ws, role=None):
    plan = plans.limits(ws)
    u = plans.usage(ws["id"])
    return {
        "id": ws["id"], "name": ws["name"], "website": ws["website"], "industry": ws["industry"], "size": ws["size"],
        "country": ws["country"], "phone": ws["phone"], "address": ws["address"], "logo_url": ws["logo_url"],
        "role": role, "onboarded": ws["onboarded"], "suspended": ws["suspended"],
        "plan": {"id": plan["id"], "name": plan["name"], "sites": plan["sites"], "members": plan["members"],
                 "interval_minutes": plan["interval_minutes"], "sms": plan["sms"] + (ws.get("sms_bonus") or 0),
                 "history_months": plan["history_months"], "channels": plan["channels"],
                 "clean_reports": plan["clean_reports"], "client_access": plan["client_access"]},
        "plan_id": ws["plan_id"], "cycle": ws["cycle"], "plan_status": ws["plan_status"], "plan_renews": ws["plan_renews"],
        "usage": u,
    }


# ---- team -----------------------------------------------------------------

def team(ws_id):
    members = db.q("""SELECT u.id, u.email, u.first_name, u.last_name, u.last_login, m.role, m.created
                      FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.created""", (ws_id,))
    invites = db.q("""SELECT id, email, role, created, expires FROM invitations
                      WHERE workspace_id=? AND accepted IS NULL AND expires>? ORDER BY created DESC""", (ws_id, time.time()))
    return {"members": members, "invites": invites}


def invite(ws, inviter, email, role):
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
    token = secrets.token_urlsafe(32)
    db.run("INSERT INTO invitations(workspace_id, email, role, token_hash, invited_by, created, expires) VALUES (?,?,?,?,?,?,?)",
           (ws["id"], email, role, hashlib.sha256(token.encode()).hexdigest(), inviter["id"], time.time(),
            time.time() + INVITE_DAYS * 86400))
    send_invite_email(ws, inviter, email, role, token)
    return token


def send_invite_email(ws, inviter, email, role, token):
    base = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
    url = f"{base}/invite/{token}"
    who = f"{inviter['first_name']} {inviter['last_name']}".strip()
    text = (f"{who} invited you to join {ws['name']} on SiteWatch as {role}.\n\nAccept the invitation: {url}\n\n"
            f"The link works for {INVITE_DAYS} days.")
    import html
    body = f"<p><b>{html.escape(who)}</b> invited you to join <b>{html.escape(ws['name'])}</b> on SiteWatch as <b>{role}</b>.</p>"
    mailer.send(email, f"{who} invited you to {ws['name']} on SiteWatch", text,
                mailer.layout("You are invited", body, ("Accept invitation", url)))


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
        db.exec("INSERT INTO memberships(workspace_id, user_id, role, created) VALUES (?,?,?,?)",
                (inv["workspace_id"], user["id"], inv["role"], time.time()))
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


def set_role(ws, actor_id, user_id, role):
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
