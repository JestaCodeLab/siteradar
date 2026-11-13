"""Google Search Console: how a website's pages do in Google search (clicks, impressions, click-through rate, average position).

Read-only. The owner connects once per website; we keep the refresh token encrypted, read the last 28 days, and list the pages that rank on the first
page of Google but get fewer clicks than a page at that position usually does. Uses the same Google OAuth client as sign-in (GOOGLE_CLIENT_ID and
GOOGLE_CLIENT_SECRET) with one more redirect address, APP_URL/api/gsc/callback."""
import datetime as dt
import logging
import os
import secrets
import time
from collections import defaultdict
from urllib.parse import quote, urlencode, urlparse

import requests

from . import db, events, google_auth, security, vault

log = logging.getLogger("sitewatch.gsc")

SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
API = "https://www.googleapis.com/webmasters/v3"
MIN_IMPRESSIONS = 300        # below this a page has too few searches to say anything
LAG_DAYS = 3                 # Search Console data is a few days behind
WINDOW_DAYS = 28
# Typical click-through rate by average position (page one). These are rough industry figures, used as a yardstick, not a promise.
TYPICAL_CTR = {1: 0.25, 2: 0.13, 3: 0.09, 4: 0.06, 5: 0.045, 6: 0.035, 7: 0.03, 8: 0.025, 9: 0.02, 10: 0.018}


def configured():
    return google_auth.configured()


def redirect_uri():
    return google_auth.redirect_uri().replace("/api/auth/google/callback", "/api/gsc/callback")


def _saved(site_id):
    return db.kv_get(f"gsc:{site_id}")


def auth_url(site, ws_id, user_id, who="", tab="analytics"):
    """Where to send the owner to approve read-only access. The state is single use and ties the answer to this website and person."""
    state = secrets.token_urlsafe(24)
    db.kv_set(f"gsc-state:{security.sha(state)}", {"site_id": site["id"], "ws_id": ws_id, "user_id": user_id, "tab": "analytics", "who": who, "created": time.time()})
    q = {"client_id": os.environ["GOOGLE_CLIENT_ID"], "redirect_uri": redirect_uri(), "response_type": "code", "scope": SCOPE,
         "state": state, "access_type": "offline", "prompt": "consent", "include_granted_scopes": "false"}
    return google_auth.AUTH_URL + "?" + urlencode(q)


def take_state(state):
    """Use a state once. Returns what was saved with it, or None when it is unknown, used or older than ten minutes."""
    key = f"gsc-state:{security.sha(state)}"
    saved = db.kv_get(key)
    if not saved or saved.get("used") or time.time() - saved["created"] > 600:
        return None
    saved["used"] = True
    db.kv_set(key, saved)
    return saved


def _token_request(data):
    r = requests.post(google_auth.TOKEN_URL, data={**data, "client_id": os.environ["GOOGLE_CLIENT_ID"], "client_secret": os.environ["GOOGLE_CLIENT_SECRET"]}, timeout=15)
    if r.status_code >= 400:
        log.warning("Google token request failed (%s): %s", r.status_code, r.text[:200])
    return r


def connect(site, code, who=""):
    """Finish the connection: trade the code for tokens, keep the refresh token encrypted, and find the Search Console property for this website."""
    r = _token_request({"code": code, "redirect_uri": redirect_uri(), "grant_type": "authorization_code"})
    r.raise_for_status()
    t = r.json()
    if not t.get("refresh_token"):
        raise RuntimeError("Google did not return long-term access.")
    prop, why = find_property(site, t["access_token"])
    db.kv_set(f"gsc:{site['id']}", {"refresh": vault.seal(t["refresh_token"]), "property": prop, "error": why, "connected_at": time.time()})
    if prop:
        events.record(site["id"], "search", "Connected Google Search Console", prop.replace("sc-domain:", ""), who=who, level="ok")
    else:
        events.record(site["id"], "search", "Connected Google, but this website is not in Search Console", "Add and verify it there, then refresh.", who=who, level="warn")
    return prop, why


def _access_token(site_id):
    saved = _saved(site_id)
    if not saved:
        return None
    refresh = vault.unseal(saved["refresh"])
    if not refresh:
        return None
    r = _token_request({"refresh_token": refresh, "grant_type": "refresh_token"})
    if r.status_code >= 400:
        if r.status_code in (400, 401):      # the owner revoked access, or the token expired
            if saved.get("error") != "revoked":
                events.record(site_id, "search", "Google Search Console access was removed or expired", "Connect it again to keep the data coming.", level="warn")
            saved.update(error="revoked")
            db.kv_set(f"gsc:{site_id}", saved)
        return None
    return r.json().get("access_token")


def find_property(site, token):
    """The Search Console property that covers this website, or (None, why)."""
    r = requests.get(f"{API}/sites", headers={"Authorization": "Bearer " + token}, timeout=15)
    if r.status_code >= 400:
        return None, "list_failed"
    host = (urlparse(site["url"]).hostname or "").lower()
    bare = host.removeprefix("www.")
    ok = [s["siteUrl"] for s in r.json().get("siteEntry", []) if s.get("permissionLevel") != "siteUnverifiedUser"]
    for want in (f"sc-domain:{bare}", f"https://{host}/", f"https://{bare}/", f"https://www.{bare}/", f"http://{host}/", f"http://{bare}/"):
        if want in ok:
            return want, None
    return None, "no_property"


def disconnect(site_id, who=""):
    saved = _saved(site_id)
    if saved:
        token = vault.unseal(saved["refresh"])
        if token:
            try:
                requests.post("https://oauth2.googleapis.com/revoke", data={"token": token}, timeout=10)
            except requests.RequestException:
                pass
    for k in (f"gsc:{site_id}", f"gsc-data:{site_id}"):
        db.exec("DELETE FROM kv WHERE key=?", (k,))
    if saved:
        events.record(site_id, "search", "Disconnected Google Search Console", "The saved search data was removed.", who=who, level="warn")


def _query(prop, token, body):
    r = requests.post(f"{API}/sites/{quote(prop, safe='')}/searchAnalytics/query", headers={"Authorization": "Bearer " + token}, json=body, timeout=30)
    r.raise_for_status()
    return r.json().get("rows", [])


def refresh(site):
    """Read the last 28 days from Google and keep a summary. Returns the saved data, or None when there is no access."""
    saved = _saved(site["id"])
    if not saved or not saved.get("property"):
        return None
    token = _access_token(site["id"])
    if not token:
        return None
    end = dt.date.today() - dt.timedelta(days=LAG_DAYS)
    start = end - dt.timedelta(days=WINDOW_DAYS - 1)
    base = {"startDate": start.isoformat(), "endDate": end.isoformat(), "type": "web"}
    pages = _query(saved["property"], token, {**base, "dimensions": ["page"], "rowLimit": 500})
    qrows = _query(saved["property"], token, {**base, "dimensions": ["page", "query"], "rowLimit": 5000})
    # one point per day for the last 90 days, with the days Google leaves out filled in as zeros
    start90 = end - dt.timedelta(days=89)
    got = {r["keys"][0]: r for r in _query(saved["property"], token, {"startDate": start90.isoformat(), "endDate": end.isoformat(), "type": "web", "dimensions": ["date"], "rowLimit": 100})}
    series = []
    for i in range(90):
        d = (start90 + dt.timedelta(days=i)).isoformat()
        r = got.get(d)
        series.append({"d": d, "clicks": int(r["clicks"]), "impressions": int(r["impressions"]), "ctr": r["ctr"], "position": round(r["position"], 1)} if r
                      else {"d": d, "clicks": 0, "impressions": 0, "ctr": 0, "position": None})
    row = lambda r, key: {key: r["keys"][0], "clicks": int(r["clicks"]), "impressions": int(r["impressions"]), "ctr": r["ctr"], "position": round(r["position"], 1)}
    queries = [row(r, "query") for r in _query(saved["property"], token, {**base, "dimensions": ["query"], "rowLimit": 100})]
    countries = [row(r, "country") for r in _query(saved["property"], token, {**base, "dimensions": ["country"], "rowLimit": 50})]
    terms = defaultdict(list)
    for r in qrows:
        terms[r["keys"][0]].append({"query": r["keys"][1], "clicks": int(r["clicks"]), "impressions": int(r["impressions"])})
    out = []
    for r in pages:
        url = r["keys"][0]
        top = sorted(terms.get(url, []), key=lambda q: -q["impressions"])[:5]
        out.append({"page": url, "clicks": int(r["clicks"]), "impressions": int(r["impressions"]), "ctr": r["ctr"], "position": round(r["position"], 1), "queries": top})
    data = {"fetched": time.time(), "start": start.isoformat(), "end": end.isoformat(), "pages": out, "series": series, "queries": queries, "countries": countries}
    db.kv_set(f"gsc-data:{site['id']}", data)
    return data


def auto_refresh(site, every=24 * 3600):
    """The scheduler calls this: re-read a connected website once a day."""
    data = db.kv_get(f"gsc-data:{site['id']}")
    saved = _saved(site["id"])
    if saved and saved.get("property") and (not data or time.time() - data["fetched"] > every):
        try:
            refresh(site)
        except Exception:
            log.exception("Search Console refresh failed for %s", site["id"])


def expected_ctr(position):
    return TYPICAL_CTR[min(10, max(1, round(position)))]


def analyse(data):
    """The totals and the pages worth improving: on page one, enough searches, and a click rate well under what that position usually gets."""
    pages = data["pages"]
    clicks = sum(p["clicks"] for p in pages)
    imps = sum(p["impressions"] for p in pages)
    summary = {"clicks": clicks, "impressions": imps, "ctr": (clicks / imps) if imps else 0,
               "position": round(sum(p["position"] * p["impressions"] for p in pages) / imps, 1) if imps else None, "pages": len(pages)}
    scale = 30 / WINDOW_DAYS
    opps = []
    for p in pages:
        if p["impressions"] < MIN_IMPRESSIONS or p["position"] > 10.49:
            continue
        exp = expected_ctr(p["position"])
        if p["ctr"] >= exp * 0.7:
            continue
        opps.append({**p, "expected_ctr": exp, "missed_clicks": round((exp - p["ctr"]) * p["impressions"] * scale)})
    opps.sort(key=lambda o: -o["missed_clicks"])
    return summary, opps[:25]
