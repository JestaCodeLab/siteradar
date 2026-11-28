"""Sign-ins, kept on the server so they can be ended at once.

The browser holds two random tokens in HttpOnly cookies; the database keeps only their hashes.

* The access token proves who is calling. It works for ACCESS_SECONDS.
* The refresh token, sent only to /api/auth, buys a new pair. It is replaced every time it is used. One that was already replaced
  turning up again means two parties hold the sign-in, so the sign-in is ended for both.

The sign-in itself lasts SESSION_SECONDS. "Stay logged in" starts that period again, up to MAX_SECONDS after signing in; refreshing a
token never moves the deadline. Both tokens start with the sign-in's own random id, so an old token can be traced to its sign-in.

Flask's signed cookie (`session`) plays no part in who is signed in. It only carries the steps of a sign-up or a Google sign-in."""
import hashlib
import hmac
import json
import logging
import os
import secrets
import time

from flask import current_app, g, request

from . import db

log = logging.getLogger("sitewatch.sessions")

ACCESS_COOKIE, REFRESH_COOKIE = "sr_access", "sr_refresh"
REFRESH_PATH = "/api/auth"          # sign-in routes only: refresh and logout need it, nothing else should ever see it
SESSION_SECONDS = int(float(os.environ.get("SESSION_MINUTES", "60")) * 60)        # a sign-in lasts this long unless the person chooses to stay
MAX_SECONDS = max(SESSION_SECONDS, int(float(os.environ.get("SESSION_MAX_HOURS", "12")) * 3600))      # after this they sign in again
ACCESS_SECONDS = int(float(os.environ.get("ACCESS_TOKEN_MINUTES", "15")) * 60)
GRACE_SECONDS = 30          # how long the replaced pair is still understood: two tabs, or requests already on their way, are not a theft


def _hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def _same(token, stored):
    return bool(stored) and hmac.compare_digest(_hash(token), stored)


def _find(cookie):
    """The live sign-in a cookie belongs to, and the cookie's value. Says nothing yet about whether the token itself is good."""
    token = request.cookies.get(cookie, "")
    sid = token.partition(".")[0]
    if not sid:
        return None, token
    row = db.q1("SELECT * FROM sessions WHERE id=? AND expires>?", (sid, time.time()))
    return row, token


def _tokens(sid):
    return f"{sid}.{secrets.token_urlsafe(32)}", f"{sid}.{secrets.token_urlsafe(32)}"


def _view(row):
    return {**row, "imp": json.loads(row["imp"]) if row["imp"] else None}


def load():
    """(sign-in, stale) for this request. `stale` means the sign-in is alive but its access token must be refreshed first."""
    row, token = _find(ACCESS_COOKIE)
    if not row:
        return None, False
    now = time.time()
    if _same(token, row["access_hash"]):
        return (_view(row), False) if row["access_expires"] > now else (None, True)
    if _same(token, row["prev_access_hash"]) and now - row["rotated"] < GRACE_SECONDS and row["access_expires"] > now:
        return _view(row), False
    return None, True          # an old token: useless, but a browser that also holds the current refresh token can carry on


def start(user, ws_id=None, remember=True):
    """A new sign-in for this browser. Any it had before ends."""
    end()
    now = time.time()
    sid = secrets.token_urlsafe(18)
    access, refresh = _tokens(sid)
    db.exec("DELETE FROM sessions WHERE user_id=? AND expires<?", (user["id"], now))
    db.exec("""INSERT INTO sessions(id, user_id, ver, access_hash, access_expires, refresh_hash, rotated, created, expires, hard_expires, remember, ws)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (sid, user["id"], user["session_ver"], _hash(access), now + ACCESS_SECONDS, _hash(refresh), now, now,
             now + SESSION_SECONDS, now + MAX_SECONDS, int(bool(remember)), ws_id))
    g.session = _view(db.q1("SELECT * FROM sessions WHERE id=?", (sid,)))
    g.session_cookies = (access, refresh)


def refresh():
    """Trade the refresh token for a new pair. Returns "ok", "busy" (just done by another request) or "ended"."""
    row, token = _find(REFRESH_COOKIE)
    if not row:
        g.session_cookies = ()
        return "ended"
    user = db.q1("SELECT disabled, session_ver FROM users WHERE id=?", (row["user_id"],))
    if not user or user["disabled"] or user["session_ver"] != row["ver"]:
        _drop(row["id"])
        g.session_cookies = ()
        return "ended"
    now = time.time()
    access, new = _tokens(row["id"])
    # One statement checks the token and replaces it, so of two requests with the same token only one succeeds.
    done = db.q1("""UPDATE sessions SET prev_access_hash=access_hash, prev_refresh_hash=refresh_hash, access_hash=?, refresh_hash=?,
                    access_expires=?, rotated=? WHERE id=? AND refresh_hash=? RETURNING *""",
                 (_hash(access), _hash(new), now + ACCESS_SECONDS, now, row["id"], _hash(token)))
    if done:
        g.session, g.session_cookies = _view(done), (access, new)
        return "ok"
    row = db.q1("SELECT * FROM sessions WHERE id=?", (row["id"],))
    if row and _same(token, row["prev_refresh_hash"]) and now - row["rotated"] < GRACE_SECONDS:
        return "busy"          # the other request's answer carries the new cookies
    if row:
        log.warning("A replaced refresh token was used again: sign-in of user %s ended", row["user_id"])
        _drop(row["id"])
    g.session_cookies = ()
    return "ended"


def update(**values):
    """Change what the current sign-in remembers: ws, imp, mfa or ver."""
    if not g.session:
        return
    for name, value in values.items():
        if name not in ("ws", "imp", "mfa", "ver"):
            raise KeyError(name)
        stored = json.dumps(value) if name == "imp" and value else int(value) if name == "mfa" else value
        db.exec(f"UPDATE sessions SET {name}=? WHERE id=?", (stored, g.session["id"]))
        g.session[name] = value


def extend():
    """"Stay logged in": another full period from now, but never past the longest a sign-in may last. Returns the seconds left."""
    now = time.time()
    expires = min(now + SESSION_SECONDS, g.session["hard_expires"])
    db.exec("UPDATE sessions SET expires=? WHERE id=?", (expires, g.session["id"]))
    g.session["expires"] = expires
    return max(0, int(expires - now))


def _drop(sid):
    db.exec("DELETE FROM sessions WHERE id=?", (sid,))


def end():
    """Sign this browser out: the sign-in is removed from the server, so copies of its cookies stop working too."""
    ids = {g.session["id"]} if g.get("session") else set()
    for cookie in (ACCESS_COOKIE, REFRESH_COOKIE):          # either cookie is enough, as long as it holds a token we issued
        row, token = _find(cookie)
        if row and any(_same(token, row[k]) for k in ("access_hash", "refresh_hash", "prev_access_hash", "prev_refresh_hash")):
            ids.add(row["id"])
    for sid in ids:
        _drop(sid)
    g.session, g.session_cookies = None, ()


def apply(response):
    """Write or clear the two cookies when this request changed the sign-in."""
    tokens = g.get("session_cookies")
    if tokens is None:
        return response
    flags = {"httponly": True, "samesite": "Lax", "secure": current_app.config["SESSION_COOKIE_SECURE"]}
    if not tokens:
        response.delete_cookie(ACCESS_COOKIE, path="/", **flags)
        response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH, **flags)
        return response
    # Both cookies outlive the access token: the website only lets a page open when it sees the access cookie. Not remembered: they
    # end when the browser closes.
    age = max(0, int(g.session["hard_expires"] - time.time())) if g.session["remember"] else None
    response.set_cookie(ACCESS_COOKIE, tokens[0], max_age=age, path="/", **flags)
    response.set_cookie(REFRESH_COOKIE, tokens[1], max_age=age, path=REFRESH_PATH, **flags)
    return response
