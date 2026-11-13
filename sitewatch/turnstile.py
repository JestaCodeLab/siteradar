"""Cloudflare Turnstile: a check that a sign-up is made by a person. The page shows a small widget, Cloudflare gives it a one-time token, and the server asks
Cloudflare whether the token is genuine. Switched on by setting TURNSTILE_SECRET; without it nothing is checked (local development)."""
import logging
import os

import requests

log = logging.getLogger("sitewatch.turnstile")
VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def enabled():
    return bool(os.environ.get("TURNSTILE_SECRET"))


def verify(token, ip=None):
    """True when Cloudflare says the token is genuine and unused. If Cloudflare cannot be reached the check fails, so a bot cannot get in during an outage."""
    if not token or not isinstance(token, str) or len(token) > 4096:
        return False
    try:
        r = requests.post(VERIFY, data={"secret": os.environ["TURNSTILE_SECRET"], "response": token, **({"remoteip": ip} if ip else {})}, timeout=8)
        return bool(r.json().get("success"))
    except (requests.RequestException, ValueError):
        log.exception("Turnstile could not be checked")
        return False
