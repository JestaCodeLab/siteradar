"""Websites live in the database, each owned by one workspace (customer account)."""
import json
import re
import secrets
import time
from urllib.parse import urlparse

from . import db, netguard, plans

LIST_FIELDS = ("report_to", "alert_to")


def _row(r):
    site = dict(r)
    for f in LIST_FIELDS:
        site[f] = json.loads(site[f]) if site.get(f) else []
    site["track_analytics"] = bool(site["track_analytics"])
    site["audit"] = bool(site["audit"])
    site["paused"] = bool(site.get("paused"))
    site["owner"] = site.get("owner") or ""
    return site


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def normalise_url(url):
    url = (url or "").strip()
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url
    p = urlparse(url)
    if not p.netloc or "." not in p.netloc:
        raise ValueError("Enter a valid website address, for example https://www.example.com")
    if not netguard.is_public_url(url):
        raise ValueError("That address points to a private network and cannot be monitored.")
    return url.rstrip("/") or url


def _insert(site):
    db.run("""INSERT INTO sites(id, name, url, keyword, owner, report_to, alert_to, track_analytics, audit, created, workspace_id)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
           (site["id"], site["name"], site["url"], site.get("keyword"), site.get("owner", ""),
            json.dumps(site.get("report_to") or []), json.dumps(site.get("alert_to") or []),
            int(site.get("track_analytics", True)), int(site.get("audit", True)), time.time(), site.get("workspace_id")))


def get(ws_id, site_id):
    r = db.q1("SELECT * FROM sites WHERE id=? AND workspace_id=?", (site_id, ws_id))
    return _row(r) if r else None


def get_any(site_id):
    """Look up a site without a workspace check. Only for the public analytics endpoint."""
    r = db.q1("SELECT * FROM sites WHERE id=?", (site_id,))
    return _row(r) if r else None


def list_ws(ws_id):
    return [_row(r) for r in db.q("SELECT * FROM sites WHERE workspace_id=? ORDER BY created, name", (ws_id,))]


def refresh(cfg):
    """Reload cfg['sites'] in place, so the running scheduler sees changes straight away."""
    cfg["sites"][:] = [_row(r) for r in db.q("SELECT * FROM sites ORDER BY created, name")]


def init(cfg):
    refresh(cfg)


def create(cfg, ws, data):
    plans.check_can_add_site(ws)
    name = (data.get("name") or "").strip()
    if not name:
        raise ValueError("Give the website a name.")
    url = normalise_url(data.get("url"))
    base = slug(name) or slug(urlparse(url).netloc)
    site_id = base
    while db.q1("SELECT 1 FROM sites WHERE id=?", (site_id,)):    # ids are shared by every customer
        site_id = f"{base}-{secrets.token_hex(2)}"
    _insert({"id": site_id, "workspace_id": ws["id"], "name": name, "url": url, "keyword": (data.get("keyword") or None),
             "owner": data.get("owner", ""), "report_to": data.get("report_to") or [],
             "alert_to": data.get("alert_to") or []})
    refresh(cfg)
    return next(s for s in cfg["sites"] if s["id"] == site_id)


def update(cfg, site_id, data):
    sets, args = [], []
    if "name" in data:
        if not str(data["name"]).strip():
            raise ValueError("Give the website a name.")
        sets.append("name=?"); args.append(str(data["name"]).strip())
    if "url" in data:
        sets.append("url=?"); args.append(normalise_url(data["url"]))
    for f in ("keyword", "owner"):
        if f in data:
            sets.append(f"{f}=?"); args.append(data[f] or None if f == "keyword" else data[f] or "")
    for f in LIST_FIELDS:
        if f in data:
            sets.append(f"{f}=?"); args.append(json.dumps(list(data[f] or [])))
    for f in ("track_analytics", "audit"):
        if f in data:
            sets.append(f"{f}=?"); args.append(int(bool(data[f])))
    if sets:
        db.run(f"UPDATE sites SET {', '.join(sets)} WHERE id=?", (*args, site_id))
        refresh(cfg)


def delete(cfg, site_id):
    """Stops monitoring. Check, audit and analytics history stays in the database."""
    from . import screenshot
    screenshot.remove(cfg, site_id)
    db.run("UPDATE subscriptions SET site_id=NULL WHERE site_id=?", (site_id,))
    db.run("DELETE FROM sites WHERE id=?", (site_id,))
    refresh(cfg)


def enforce_limit(cfg, ws):
    """After a plan change: keep the oldest sites running up to the plan limit and pause the rest (nothing is deleted)."""
    limit = plans.limits(ws)["sites"]
    rows = db.q("SELECT id FROM sites WHERE workspace_id=? ORDER BY created, name", (ws["id"],))
    for i, r in enumerate(rows):
        db.run("UPDATE sites SET paused=? WHERE id=?", (int(i >= limit), r["id"]))
    refresh(cfg)
