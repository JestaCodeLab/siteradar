"""Sign in with Google (OAuth 2.0 authorization code flow). Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."""
import os
from urllib.parse import urlencode

import requests

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def configured():
    return bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))


def redirect_uri():
    """Goes through the website's own address, so the session cookie lands on the site people use."""
    return os.environ.get("APP_URL", "http://localhost:3000").rstrip("/") + "/api/auth/google/callback"


def auth_url(state):
    q = {"client_id": os.environ["GOOGLE_CLIENT_ID"], "redirect_uri": redirect_uri(), "response_type": "code",
         "scope": "openid email profile", "state": state, "prompt": "select_account", "access_type": "online"}
    return AUTH_URL + "?" + urlencode(q)


def profile_for(code):
    """Trade the one-time code for the person's Google profile: sub, email, email_verified, given_name, family_name."""
    t = requests.post(TOKEN_URL, data={
        "code": code, "client_id": os.environ["GOOGLE_CLIENT_ID"], "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "redirect_uri": redirect_uri(), "grant_type": "authorization_code"}, timeout=15)
    t.raise_for_status()
    r = requests.get(USERINFO_URL, headers={"Authorization": "Bearer " + t.json()["access_token"]}, timeout=15)
    r.raise_for_status()
    return r.json()
