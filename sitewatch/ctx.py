"""Who is making this request: the signed-in user, the workspace they are working in and their role there.

The sign-in itself (sessions.py) remembers: the active workspace (ws), a super admin support session (imp: ws, until, reason, mode)
and whether the second sign-in step was passed (mfa).
"""
import functools
import time

from flask import g, jsonify

from . import accounts, sessions, totp

SUPPORT_MINUTES = 30


def mfa_state(user):
    """None when nothing more is needed. For a super admin who has not given a code in this sign-in: 'setup' (no authenticator yet) or 'verify'."""
    if not user or not user["is_super"] or not totp.required() or (g.session and g.session["mfa"]):
        return None
    return "verify" if user.get("totp_enabled") else "setup"


def load():
    g.user = g.ws = g.role = None
    g.mfa_pending = None
    g.impersonating = None
    g.site_access = None
    g.session_cookies = None          # set by sessions.py when the cookies must change
    g.session, g.token_expired = sessions.load()
    if not g.session:
        return
    user = accounts.user_by_id(g.session["user_id"])
    if not user or user["disabled"] or g.session["ver"] != user["session_ver"]:      # disabled, or signed out from another device
        sessions.end()
        return
    g.mfa_pending = mfa_state(user)
    if g.mfa_pending:          # until the code is given, a super admin is an ordinary person: no admin area, no support sessions
        user = {**user, "is_super": 0}
    g.user = user
    imp = g.session["imp"]
    if imp and imp["until"] > time.time() and user["is_super"]:
        g.ws = accounts.workspace(imp["ws"])
        g.role = "admin" if imp["mode"] == "edit" else "viewer"
        g.impersonating = imp
        return
    if imp:
        sessions.update(imp=None)
    mine = accounts.memberships(user["id"])
    chosen = next((w for w in mine if w["id"] == g.session["ws"]), None) or (mine[0] if mine else None)
    if chosen:
        g.ws, g.role = chosen, chosen["role"]
        g.site_access = accounts.site_access(user["id"], chosen["id"]) if chosen["role"] in ("member", "viewer") else None
        if g.session["ws"] != chosen["id"]:
            sessions.update(ws=chosen["id"])


def error(message, status, code=None):
    return jsonify(error=message, code=code), status


def signed_out():
    """The answer when nobody is signed in. "token_expired" tells the website to refresh its access token and ask again."""
    if g.token_expired:
        return error("Your access has to be refreshed.", 401, "token_expired")
    return error("Login required", 401, "login")


def login_required(fn):
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        if not g.user:
            return signed_out()
        return fn(*a, **kw)
    return wrapper


def workspace_required(fn):
    """Signed in, with a workspace that is not suspended."""
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        if not g.user:
            return signed_out()
        if not g.ws:
            return error("Finish setting up your account first.", 409, "no_workspace")
        if g.ws["suspended"] and not g.impersonating:
            return error("This account is suspended. Contact support.", 403, "suspended")
        return fn(*a, **kw)
    return wrapper


def need(role):
    """Require at least this role. Viewers are read-only everywhere."""
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            if not g.user:
                return signed_out()
            if accounts.RANK.get(g.role, -1) < accounts.RANK[role]:
                msg = "You have view-only access." if g.role == "viewer" else "You don't have permission to do that."
                return error(msg, 403, "forbidden")
            return fn(*a, **kw)
        return wrapper
    return deco


def super_required(fn):
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        if not g.user:
            return signed_out()
        if not g.user["is_super"]:
            return error("Not found", 404)
        return fn(*a, **kw)
    return wrapper
