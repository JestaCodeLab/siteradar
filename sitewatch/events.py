"""A record of what people (and the plugin) did to a website: fixes applied and undone, manual audits, plugin downloads and checks.

It is shown on the Activity logs page. Writing to it never stops the action it describes."""
import logging
import time

from . import db

log = logging.getLogger("sitewatch.events")

# kinds: fix, audit_run, plugin


def record(site_id, kind, title, detail="", who="", level="info"):
    try:
        db.exec("INSERT INTO site_events(site_id, ts, who, kind, level, title, detail) VALUES (?,?,?,?,?,?,?)",
                (site_id, time.time(), who or "", kind, level, title, detail or ""))
    except Exception:
        log.exception("Could not record the event %s for %s", kind, site_id)


def fetch(site_ids, kinds, before, limit):
    """Newest first, older than `before`."""
    if not site_ids:
        return []
    return db.q("SELECT site_id, ts, who, kind, level, title, detail FROM site_events WHERE site_id = ANY(?) AND kind = ANY(?) AND ts<? ORDER BY ts DESC LIMIT ?",
                (site_ids, kinds, before, limit))
