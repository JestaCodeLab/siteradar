"""Who is making this request: the signed-in user, the workspace they are working in and their role there.

Session keys: uid, ws (active workspace id), imp (super admin support session: ws, until, reason, mode).
"""
import functools
import os
import time

from flask import g, jsonify, session

from . import accounts, plans, totp

SUPPORT_MINUTES = 30
SESSION_SECONDS = int(float(os.environ.get("SESSION_MINUTES", "60")) * 60)      # a login lasts this long unless the person chooses to stay


def mfa_state(user):
    """None when nothing more is needed. For a super admin who has not given a code in this sign-in: 'setup' (no authenticator yet) or 'verify'."""
    if not user or not user["is_super"] or not totp.required() or session.get("mfa"):
        return None
    return "verify" if user.get("totp_enabled") else "setup"


def load():
    g.user = g.ws = g.role = None
    g.mfa_pending = None
    g.impersonating = None
    g.site_access = None
    uid = session.get("uid")
    if not uid:          # not signed in: leave the cookie alone, it holds the steps of a sign-up or a Google sign-in
        return
    if session.get("exp", time.time() + 1) < time.time():      # the hour is up
        session.clear()
        return
    user = accounts.user_by_id(uid)
    if not user or user["disabled"]:
        session.clear()
        return
    if session.get("ver", 0) != user["session_ver"]:      # signed out from another device
        session.clear()
        return
    g.mfa_pending = mfa_state(user)
    if g.mfa_pending:          # until the code is given, a super admin is an ordinary person: no admin area, no support sessions
        user = {**user, "is_super": 0}
    g.user = user
    session.setdefault("exp", time.time() + SESSION_SECONDS)      # sessions from before this rule get a full hour
    imp = session.get("imp")
    if imp and imp["until"] > time.time() and user["is_super"]:
        g.ws = accounts.workspace(imp["ws"])
        g.role = "admin" if imp["mode"] == "edit" else "viewer"
        g.impersonating = imp
        return
    session.pop("imp", None)
    mine = accounts.memberships(user["id"])
    chosen = next((w for w in mine if w["id"] == session.get("ws")), None) or (mine[0] if mine else None)
    if chosen:
        g.ws, g.role = chosen, chosen["role"]
        g.site_access = accounts.site_access(user["id"], chosen["id"]) if chosen["role"] in ("member", "viewer") else None
        session["ws"] = chosen["id"]


def error(message, status, code=None):
    return jsonify(error=message, code=code), status


def login_required(fn):
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        if not g.user:
            return error("Login required", 401, "login")
        return fn(*a, **kw)
    return wrapper


def workspace_required(fn):
    """Signed in, with a workspace that is not suspended."""
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        if not g.user:
            return error("Login required", 401, "login")
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
            return error("Login required", 401, "login")
        if not g.user["is_super"]:
            return error("Not found", 404)
        return fn(*a, **kw)
    return wrapper
