"""SQLite storage. One file, no server needed."""
import json
import os
import sqlite3
import threading
import time

SCHEMA = """
CREATE TABLE IF NOT EXISTS checks (
    id INTEGER PRIMARY KEY, site_id TEXT, ts REAL, ok INTEGER,
    status_code INTEGER, response_ms INTEGER, error TEXT, ssl_days_left INTEGER
);
CREATE INDEX IF NOT EXISTS idx_checks_site_ts ON checks(site_id, ts);

CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY, site_id TEXT, started REAL, ended REAL, cause TEXT
);
CREATE INDEX IF NOT EXISTS idx_inc_site ON incidents(site_id, started);

CREATE TABLE IF NOT EXISTS hits (
    id INTEGER PRIMARY KEY, site_id TEXT, ts REAL, path TEXT, referrer TEXT,
    visitor TEXT, device TEXT, browser TEXT, os TEXT, screen INTEGER,
    utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, load_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_hits_site_ts ON hits(site_id, ts);

CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY, site_id TEXT, ts REAL, pages INTEGER,
    scores TEXT, issues TEXT, pagespeed TEXT
);
CREATE INDEX IF NOT EXISTS idx_audits_site_ts ON audits(site_id, ts);

CREATE TABLE IF NOT EXISTS alerts_sent (
    id INTEGER PRIMARY KEY, site_id TEXT, ts REAL, kind TEXT, message TEXT
);

CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, keyword TEXT, owner TEXT,
    report_to TEXT, alert_to TEXT, track_analytics INTEGER DEFAULT 1, audit INTEGER DEFAULT 1,
    created REAL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY, site_id TEXT, name TEXT NOT NULL, category TEXT, provider TEXT,
    amount REAL NOT NULL, currency TEXT DEFAULT 'USD', cycle TEXT NOT NULL,
    started TEXT, next_renewal TEXT NOT NULL, auto_renew INTEGER DEFAULT 1,
    remind_days INTEGER DEFAULT 14, notes TEXT, active INTEGER DEFAULT 1, created REAL
);
CREATE INDEX IF NOT EXISTS idx_subs_site ON subscriptions(site_id);

CREATE TABLE IF NOT EXISTS domain_checks (
    id INTEGER PRIMARY KEY, site_id TEXT, domain TEXT, ts REAL, expires TEXT, registrar TEXT, status TEXT, error TEXT
);
CREATE INDEX IF NOT EXISTS idx_domain_site_ts ON domain_checks(site_id, ts);

CREATE TABLE IF NOT EXISTS dns_snapshots (
    id INTEGER PRIMARY KEY, site_id TEXT, ts REAL, records TEXT, checks TEXT, changes TEXT
);
CREATE INDEX IF NOT EXISTS idx_dns_site_ts ON dns_snapshots(site_id, ts);

CREATE TABLE IF NOT EXISTS sitemap_snapshots (
    id INTEGER PRIMARY KEY, site_id TEXT, ts REAL, sitemap_url TEXT, total INTEGER, checked INTEGER,
    broken TEXT, redirects INTEGER, added INTEGER, removed INTEGER, urls TEXT, error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sitemap_site_ts ON sitemap_snapshots(site_id, ts);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY, subscription_id INTEGER NOT NULL, period TEXT NOT NULL,
    filename TEXT NOT NULL, original_name TEXT, size INTEGER, uploaded REAL
);
CREATE INDEX IF NOT EXISTS idx_inv_sub ON invoices(subscription_id, period);
"""

_local = threading.local()
_path = None


def init(data_dir):
    global _path
    _path = os.path.join(data_dir, "sitewatch.db")
    with connect() as c:
        c.executescript(SCHEMA)
        try:                                  # added later: the certificate's exact expiry date
            c.execute("ALTER TABLE checks ADD COLUMN ssl_expires TEXT")
        except sqlite3.OperationalError:
            pass


def connect():
    conn = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(_path, timeout=30, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        _local.conn = conn
    return conn


def q(sql, args=()):
    return [dict(r) for r in connect().execute(sql, args).fetchall()]


def q1(sql, args=()):
    rows = q(sql, args)
    return rows[0] if rows else None


def run(sql, args=()):
    c = connect()
    cur = c.execute(sql, args)
    c.commit()
    return cur.lastrowid


# ---- convenience helpers -------------------------------------------------

def open_incident(site_id):
    return q1("SELECT * FROM incidents WHERE site_id=? AND ended IS NULL ORDER BY started DESC LIMIT 1", (site_id,))


def normalise_pagespeed(ps):
    """Audits before desktop support stored a single (mobile) result; new ones hold both."""
    if "scores" in ps:
        return {"mobile": ps, "desktop": None}
    return {"mobile": ps.get("mobile"), "desktop": ps.get("desktop")}


def latest_audit(site_id, before=None):
    sql = "SELECT * FROM audits WHERE site_id=?"
    args = [site_id]
    if before:
        sql += " AND ts < ?"
        args.append(before)
    row = q1(sql + " ORDER BY ts DESC LIMIT 1", args)
    if row:
        row["scores"] = json.loads(row["scores"])
        row["issues"] = json.loads(row["issues"])
        row["pagespeed"] = normalise_pagespeed(json.loads(row["pagespeed"])) if row["pagespeed"] else None
    return row


def log_alert(site_id, kind, message):
    run("INSERT INTO alerts_sent(site_id, ts, kind, message) VALUES (?,?,?,?)",
        (site_id, time.time(), kind, message))


def last_alert(site_id, kind):
    return q1("SELECT * FROM alerts_sent WHERE site_id=? AND kind=? ORDER BY ts DESC LIMIT 1", (site_id, kind))
