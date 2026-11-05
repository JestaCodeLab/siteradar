"""Postgres storage (psycopg 3 with a connection pool).

Everything goes through q (many rows), q1 (one row), run (insert/update, returns the new id)
and exec (statement with no result). SQL is written with ? placeholders and converted here.
"""
import decimal
import json
import logging
import os
import time

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

log = logging.getLogger("sitewatch.db")
_pool = None
TZ = "UTC"          # the time zone used when grouping checks into days

# Add new schema changes as a new (version, sql) entry at the end. Never edit an applied one.
MIGRATIONS = [
    (1, """
CREATE TABLE checks (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, ts DOUBLE PRECISION, ok INTEGER,
    status_code INTEGER, response_ms INTEGER, error TEXT, ssl_days_left INTEGER, ssl_expires TEXT
);
CREATE INDEX idx_checks_site_ts ON checks(site_id, ts);

CREATE TABLE incidents (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, started DOUBLE PRECISION, ended DOUBLE PRECISION, cause TEXT
);
CREATE INDEX idx_inc_site ON incidents(site_id, started);

CREATE TABLE hits (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, ts DOUBLE PRECISION, path TEXT, referrer TEXT,
    visitor TEXT, device TEXT, browser TEXT, os TEXT, screen INTEGER,
    utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, load_ms INTEGER
);
CREATE INDEX idx_hits_site_ts ON hits(site_id, ts);

CREATE TABLE audits (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, ts DOUBLE PRECISION, pages INTEGER,
    scores TEXT, issues TEXT, pagespeed TEXT
);
CREATE INDEX idx_audits_site_ts ON audits(site_id, ts);

CREATE TABLE alerts_sent (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, ts DOUBLE PRECISION, kind TEXT, message TEXT
);

CREATE TABLE sites (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, keyword TEXT, owner TEXT,
    report_to TEXT, alert_to TEXT, track_analytics INTEGER DEFAULT 1, audit INTEGER DEFAULT 1,
    created DOUBLE PRECISION
);

CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, name TEXT NOT NULL, category TEXT, provider TEXT,
    amount DOUBLE PRECISION NOT NULL, currency TEXT DEFAULT 'USD', cycle TEXT NOT NULL,
    started TEXT, next_renewal TEXT NOT NULL, auto_renew INTEGER DEFAULT 1,
    remind_days INTEGER DEFAULT 14, notes TEXT, active INTEGER DEFAULT 1, created DOUBLE PRECISION
);
CREATE INDEX idx_subs_site ON subscriptions(site_id);

CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY, subscription_id BIGINT NOT NULL, period TEXT NOT NULL,
    filename TEXT NOT NULL, original_name TEXT, size INTEGER, uploaded DOUBLE PRECISION
);
CREATE INDEX idx_inv_sub ON invoices(subscription_id, period);

CREATE TABLE domain_checks (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, domain TEXT, ts DOUBLE PRECISION, expires TEXT,
    registrar TEXT, status TEXT, error TEXT
);
CREATE INDEX idx_domain_site_ts ON domain_checks(site_id, ts);

CREATE TABLE dns_snapshots (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, ts DOUBLE PRECISION, records TEXT, checks TEXT, changes TEXT
);
CREATE INDEX idx_dns_site_ts ON dns_snapshots(site_id, ts);

CREATE TABLE sitemap_snapshots (
    id BIGSERIAL PRIMARY KEY, site_id TEXT, ts DOUBLE PRECISION, sitemap_url TEXT, total INTEGER,
    checked INTEGER, broken TEXT, redirects INTEGER, added INTEGER, removed INTEGER, urls TEXT, error TEXT
);
CREATE INDEX idx_sitemap_site_ts ON sitemap_snapshots(site_id, ts);

CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT);
"""),
]


def init(cfg):
    global _pool, TZ
    url = cfg.get("database_url") or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set. Add the Postgres connection string to the environment.")
    TZ = os.environ.get("TZ") or "UTC"
    _pool = ConnectionPool(url, min_size=1, max_size=int(os.environ.get("DB_POOL_MAX", "10")), open=True,
                           kwargs={"row_factory": dict_row, "autocommit": True})
    _pool.wait(timeout=30)
    _migrate()


def close():
    if _pool:
        _pool.close()


def _migrate():
    """Apply any schema changes that have not run yet. An advisory lock keeps two services from racing."""
    with _pool.connection() as c:
        c.execute("SELECT pg_advisory_lock(727001)")
        try:
            c.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied TIMESTAMPTZ DEFAULT now())")
            done = {r["version"] for r in c.execute("SELECT version FROM schema_migrations").fetchall()}
            for version, sql in MIGRATIONS:
                if version in done:
                    continue
                with c.transaction():
                    c.execute(sql)
                    c.execute("INSERT INTO schema_migrations(version) VALUES (%s)", (version,))
                log.info("Applied database migration %s", version)
        finally:
            c.execute("SELECT pg_advisory_unlock(727001)")


def _sql(sql):
    # Our SQL uses ? placeholders; psycopg wants %s (and a literal % must be doubled).
    return sql.replace("%", "%%").replace("?", "%s")


def _clean(row):
    return {k: (float(v) if isinstance(v, decimal.Decimal) else v) for k, v in row.items()}


def q(sql, args=()):
    with _pool.connection() as c:
        return [_clean(r) for r in c.execute(_sql(sql), tuple(args)).fetchall()]


def q1(sql, args=()):
    rows = q(sql, args)
    return rows[0] if rows else None


def run(sql, args=()):
    """Run a write. An INSERT returns the id of the new row."""
    insert = sql.lstrip()[:6].upper() == "INSERT" and "RETURNING" not in sql.upper()
    with _pool.connection() as c:
        cur = c.execute(_sql(sql + (" RETURNING id" if insert else "")), tuple(args))
        return cur.fetchone()["id"] if insert else None


def exec(sql, args=()):
    with _pool.connection() as c:
        c.execute(_sql(sql), tuple(args))


def bulk(sql, rows):
    """Insert many rows in one transaction."""
    with _pool.connection() as c:
        with c.transaction():
            with c.cursor() as cur:
                cur.executemany(_sql(sql), [tuple(r) for r in rows])


def kv_get(key, default=None):
    row = q1("SELECT value FROM kv WHERE key=?", (key,))
    return json.loads(row["value"]) if row else default


def kv_set(key, value):
    exec("INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
         (key, json.dumps(value)))


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
