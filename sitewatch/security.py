"""Request-level protections: who the caller really is, rate limits, cross-site request checks and response headers."""
import hmac
import os
import time
from urllib.parse import urlparse

from flask import request

from . import db

CLIENT_IP_HEADER = "X-Siteradar-Client-Ip"
PROXY_HEADER = "X-Siteradar-Proxy"


def client_ip():
    """The caller's address. The website's own proxy (frontend/proxy.ts) forwards the visitor's address together with the
    shared PROXY_SECRET, and only then is it believed. Any other request is judged by the address our host saw (the web server
    sets request.remote_addr from the proxy's own entry in X-Forwarded-For, see TRUST_PROXY_COUNT in __main__.py)."""
    secret = os.environ.get("PROXY_SECRET", "")
    sent = request.headers.get(PROXY_HEADER, "")
    if secret and sent and hmac.compare_digest(sent, secret):
        ip = request.headers.get(CLIENT_IP_HEADER, "").strip()
        if ip:
            return ip[:64]
    return (request.remote_addr or "")[:64]


def limited(bucket, per_minutes, maximum, key=None):
    """True when `key` (the caller's address unless given) has used up its attempts in this window. Counted in the database,
    so it holds across restarts and across several web processes."""
    k, now = key or client_ip(), time.time()
    n = db.q1("SELECT COUNT(*) n FROM rate_hits WHERE bucket=? AND key=? AND ts>?", (bucket, k, now - per_minutes * 60))["n"]
    if n >= maximum:
        return True
    db.exec("INSERT INTO rate_hits(bucket, key, ts) VALUES (?,?,?)", (bucket, k, now))
    if int(now) % 50 == 0:
        db.exec("DELETE FROM rate_hits WHERE ts<?", (now - 86400,))
    return False


def _origin(url):
    p = urlparse(url or "")
    return f"{p.scheme}://{p.netloc}".lower() if p.scheme and p.netloc else ""


def allowed_origins():
    """The website's own addresses (with and without www), plus any in ALLOWED_ORIGINS."""
    out = set()
    for var in ("APP_URL", "PUBLIC_URL"):
        o = _origin(os.environ.get(var, ""))
        if o:
            out.add(o)
            scheme, host = o.split("://", 1)
            out.add(f"{scheme}://{host[4:]}" if host.startswith("www.") else f"{scheme}://www.{host}")
    for extra in os.environ.get("ALLOWED_ORIGINS", "").split(","):
        if extra.strip():
            out.add(_origin(extra.strip()))
    return out


def cross_site_write():
    """True for a request that changes something and comes from another website. Browsers always say where a request came from
    (Origin), so a forged form or script on a different site is caught here even if a cookie would have been sent."""
    if request.method in ("GET", "HEAD", "OPTIONS") or not request.path.startswith("/api/"):
        return False
    origin = request.headers.get("Origin")
    if origin and origin != "null":
        return _origin(origin) not in allowed_origins()
    if origin == "null":
        return True
    return request.headers.get("Sec-Fetch-Site", "") == "cross-site"      # no Origin: a script or server, unless the browser says otherwise


# What a generated report page may do: show itself, and nothing else (no scripts, no forms, no framing)
REPORT_CSP = "sandbox; default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"


def harden(resp):
    """Headers on every response from the API."""
    h = resp.headers
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    h.setdefault("X-Frame-Options", "DENY")
    if resp.mimetype == "text/html":
        h["Content-Security-Policy"] = REPORT_CSP
    if request.path.startswith("/api/") and "Cache-Control" not in h:
        h["Cache-Control"] = "no-store"          # signed-in answers are never kept by a browser or a proxy
    return resp
