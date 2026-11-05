"""Who is making this request: the signed-in user, the workspace they are working in and their role there.

Session keys: uid, ws (active workspace id), imp (super admin support session: ws, until, reason, mode).
"""
import functools
import time

from flask import g, jsonify, session

from . import accounts, plans

SUPPORT_MINUTES = 30


def load():
    g.user = g.ws = g.role = None
    g.impersonating = None
    uid = session.get("uid")
    user = accounts.user_by_id(uid) if uid else None
    if not user or user["disabled"]:
        session.clear()
        return
    g.user = user
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
