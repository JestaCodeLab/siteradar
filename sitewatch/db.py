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
"""

_local = threading.local()
_path = None


def init(data_dir):
    global _path
    _path = os.path.join(data_dir, "sitewatch.db")
    with connect() as c:
        c.executescript(SCHEMA)


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
        row["pagespeed"] = json.loads(row["pagespeed"]) if row["pagespeed"] else None
    return row


def log_alert(site_id, kind, message):
    run("INSERT INTO alerts_sent(site_id, ts, kind, message) VALUES (?,?,?,?)",
        (site_id, time.time(), kind, message))


def last_alert(site_id, kind):
    return q1("SELECT * FROM alerts_sent WHERE site_id=? AND kind=? ORDER BY ts DESC LIMIT 1", (site_id, kind))
