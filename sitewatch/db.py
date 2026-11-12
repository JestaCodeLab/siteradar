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
    (2, """
CREATE TABLE plans (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, tagline TEXT, price_month DOUBLE PRECISION NOT NULL DEFAULT 0,
    sites INTEGER NOT NULL, members INTEGER NOT NULL, interval_minutes INTEGER NOT NULL,
    sms INTEGER NOT NULL DEFAULT 0, history_months INTEGER NOT NULL DEFAULT 3,
    channels TEXT NOT NULL DEFAULT '["email"]', clean_reports INTEGER NOT NULL DEFAULT 0,
    client_access INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
INSERT INTO plans(id, name, tagline, price_month, sites, members, interval_minutes, sms, history_months, channels, clean_reports, client_access, sort) VALUES
 ('free',    'Free',    'For one personal or side project',      0,   1,  1, 10,   0,  1, '["email"]',                0, 0, 1),
 ('starter', 'Starter', 'For a small business with a few sites', 99,  3,  2,  5,   0,  3, '["email","chat"]',         1, 0, 2),
 ('growth',  'Growth',  'For agencies and growing teams',       299, 15, 5,  3, 100, 12, '["email","chat","sms"]',    1, 1, 3),
 ('scale',   'Scale',   'For many sites and larger teams',      799, 50, 15, 1, 500, 24, '["email","chat","sms"]',    1, 1, 4);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL, first_name TEXT, last_name TEXT, phone TEXT,
    password_hash TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0, is_super INTEGER NOT NULL DEFAULT 0,
    disabled INTEGER NOT NULL DEFAULT 0, created DOUBLE PRECISION, last_login DOUBLE PRECISION
);
CREATE UNIQUE INDEX users_email_uq ON users(lower(email));

CREATE TABLE workspaces (
    id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, website TEXT, industry TEXT, size TEXT, country TEXT, phone TEXT,
    address TEXT, logo_url TEXT, owner_id BIGINT, plan_id TEXT NOT NULL DEFAULT 'free', cycle TEXT NOT NULL DEFAULT 'monthly',
    plan_status TEXT NOT NULL DEFAULT 'active', plan_renews DOUBLE PRECISION, pending_plan TEXT, pending_cycle TEXT,
    onboarded INTEGER NOT NULL DEFAULT 0, suspended INTEGER NOT NULL DEFAULT 0,
    alert_emails TEXT NOT NULL DEFAULT '[]', alert_phones TEXT NOT NULL DEFAULT '[]', alert_webhooks TEXT NOT NULL DEFAULT '[]',
    paystack_auth TEXT, paystack_email TEXT, paystack_card TEXT, sms_bonus INTEGER NOT NULL DEFAULT 0,
    comped INTEGER NOT NULL DEFAULT 0, notes TEXT, created DOUBLE PRECISION
);

CREATE TABLE memberships (
    workspace_id BIGINT NOT NULL, user_id BIGINT NOT NULL, role TEXT NOT NULL, created DOUBLE PRECISION,
    PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX idx_memberships_user ON memberships(user_id);

CREATE TABLE invitations (
    id BIGSERIAL PRIMARY KEY, workspace_id BIGINT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL,
    token_hash TEXT NOT NULL, invited_by BIGINT, created DOUBLE PRECISION, expires DOUBLE PRECISION, accepted DOUBLE PRECISION
);
CREATE INDEX idx_invitations_ws ON invitations(workspace_id);
CREATE INDEX idx_invitations_token ON invitations(token_hash);

CREATE TABLE email_codes (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL, purpose TEXT NOT NULL, code_hash TEXT NOT NULL,
    created DOUBLE PRECISION, expires DOUBLE PRECISION, attempts INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_email_codes_user ON email_codes(user_id, purpose);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY, workspace_id BIGINT NOT NULL, reference TEXT NOT NULL UNIQUE, plan_id TEXT, cycle TEXT,
    amount DOUBLE PRECISION, currency TEXT DEFAULT 'GHS', status TEXT NOT NULL DEFAULT 'pending', channel TEXT, kind TEXT,
    created DOUBLE PRECISION, paid DOUBLE PRECISION
);
CREATE INDEX idx_payments_ws ON payments(workspace_id, created);

CREATE TABLE admin_audit (
    id BIGSERIAL PRIMARY KEY, ts DOUBLE PRECISION, admin_id BIGINT, workspace_id BIGINT, action TEXT, detail TEXT
);

CREATE TABLE sms_log (
    id BIGSERIAL PRIMARY KEY, workspace_id BIGINT, ts DOUBLE PRECISION, phone TEXT, message TEXT, ok INTEGER, error TEXT
);
CREATE INDEX idx_sms_ws_ts ON sms_log(workspace_id, ts);

CREATE TABLE assets (key TEXT PRIMARY KEY, ref TEXT NOT NULL, mime TEXT, size INTEGER, ts DOUBLE PRECISION);

ALTER TABLE sites ADD COLUMN workspace_id BIGINT;
ALTER TABLE sites ADD COLUMN paused INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN workspace_id BIGINT;
CREATE INDEX idx_sites_ws ON sites(workspace_id);
CREATE INDEX idx_subs_ws ON subscriptions(workspace_id);
"""),
    (3, """
ALTER TABLE workspaces ADD COLUMN limits_override TEXT;
ALTER TABLE plans ADD COLUMN audit_pages INTEGER NOT NULL DEFAULT 50;
ALTER TABLE plans ADD COLUMN storage_mb INTEGER NOT NULL DEFAULT 100;
ALTER TABLE plans ADD COLUMN priority_support INTEGER NOT NULL DEFAULT 0;
UPDATE plans SET audit_pages=10,  storage_mb=10,   priority_support=0 WHERE id='free';
UPDATE plans SET audit_pages=25,  storage_mb=100,  priority_support=0 WHERE id='starter';
UPDATE plans SET audit_pages=50,  storage_mb=1024, priority_support=1 WHERE id='growth';
UPDATE plans SET audit_pages=100, storage_mb=5120, priority_support=1 WHERE id='scale';
ALTER TABLE payments ADD COLUMN method TEXT;
ALTER TABLE payments ADD COLUMN refunded DOUBLE PRECISION;
CREATE TABLE error_log (id BIGSERIAL PRIMARY KEY, ts DOUBLE PRECISION, source TEXT, text TEXT);
CREATE INDEX idx_error_log_ts ON error_log(ts);
"""),
    (4, """
ALTER TABLE memberships ADD COLUMN site_access TEXT;
ALTER TABLE invitations ADD COLUMN site_access TEXT;
"""),
    (5, """
ALTER TABLE users ADD COLUMN session_ver INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN alert_prefs TEXT;
ALTER TABLE users ADD COLUMN pending_email TEXT;
ALTER TABLE workspaces ADD COLUMN timezone TEXT DEFAULT 'Africa/Accra';
ALTER TABLE workspaces ADD COLUMN logo_name TEXT;
ALTER TABLE workspaces ADD COLUMN logo_size INTEGER;
ALTER TABLE workspaces ADD COLUMN deleted_at DOUBLE PRECISION;
"""),
    (6, """
ALTER TABLE workspaces ADD COLUMN alerts_prompted INTEGER NOT NULL DEFAULT 0;
"""),
    (7, """
ALTER TABLE users ADD COLUMN country TEXT;
"""),
    (8, """
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX users_google_uq ON users(google_sub) WHERE google_sub IS NOT NULL;
ALTER TABLE workspaces ADD COLUMN report_day INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workspaces ADD COLUMN report_at TEXT NOT NULL DEFAULT '08:00';
"""),
    (9, """
ALTER TABLE plans ADD COLUMN price_month_usd DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE plans SET price_month_usd=8 WHERE id='starter';
UPDATE plans SET price_month_usd=24 WHERE id='growth';
UPDATE plans SET price_month_usd=64 WHERE id='scale';
ALTER TABLE workspaces ADD COLUMN currency TEXT NOT NULL DEFAULT 'GHS';
UPDATE workspaces SET currency='USD' WHERE country IS NOT NULL AND country <> 'Ghana';
"""),
    (10, """
CREATE TABLE rate_hits (id BIGSERIAL PRIMARY KEY, bucket TEXT NOT NULL, key TEXT NOT NULL, ts DOUBLE PRECISION NOT NULL);
CREATE INDEX idx_rate_hits ON rate_hits(bucket, key, ts);
"""),
    (11, """
CREATE TABLE oauth_states (
    state_hash TEXT PRIMARY KEY, created DOUBLE PRECISION NOT NULL, ua_hash TEXT, ip_net TEXT, ip_family INTEGER NOT NULL DEFAULT 0,
    used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE login_tickets (
    token_hash TEXT PRIMARY KEY, user_id BIGINT NOT NULL, ws_id BIGINT, created DOUBLE PRECISION NOT NULL, ua_hash TEXT, ip_net TEXT,
    ip_family INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0
);
"""),
    (12, """
CREATE TABLE discount_codes (
    id BIGSERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT, kind TEXT NOT NULL DEFAULT 'percent',
    percent DOUBLE PRECISION NOT NULL DEFAULT 0, amount_ghs DOUBLE PRECISION NOT NULL DEFAULT 0, amount_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    plan_ids TEXT, cycles TEXT NOT NULL DEFAULT 'both', periods INTEGER NOT NULL DEFAULT 1, max_uses INTEGER,
    starts DOUBLE PRECISION, expires DOUBLE PRECISION, active INTEGER NOT NULL DEFAULT 1, created DOUBLE PRECISION NOT NULL, created_by BIGINT
);
CREATE TABLE discount_redemptions (
    id BIGSERIAL PRIMARY KEY, code_id BIGINT NOT NULL, workspace_id BIGINT NOT NULL, payment_id BIGINT NOT NULL UNIQUE,
    amount_off DOUBLE PRECISION NOT NULL, currency TEXT, renewal INTEGER NOT NULL DEFAULT 0, created DOUBLE PRECISION NOT NULL
);
CREATE INDEX idx_redemptions_code ON discount_redemptions(code_id);
ALTER TABLE payments ADD COLUMN discount_code TEXT;
ALTER TABLE payments ADD COLUMN discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN coupon_code TEXT;
ALTER TABLE workspaces ADD COLUMN coupon_left INTEGER;
"""),
    (13, """
INSERT INTO plans(id, name, tagline, price_month, price_month_usd, sites, members, interval_minutes, sms, history_months, channels, clean_reports, client_access, sort, audit_pages, storage_mb, priority_support)
 VALUES ('freelance', 'Freelance', 'For a freelancer with a single website', 175, 15, 1, 1, 10, 0, 2, '["email"]', 1, 0, 1, 15, 50, 0);
UPDATE workspaces SET plan_id='freelance', comped=1, plan_status='active' WHERE plan_id='free';
UPDATE workspaces SET pending_plan='freelance' WHERE pending_plan='free';
UPDATE payments SET plan_id='freelance' WHERE plan_id='free';
DELETE FROM plans WHERE id='free';
UPDATE plans SET price_month=350,  price_month_usd=29.99  WHERE id='starter';
UPDATE plans SET price_month=750,  price_month_usd=69.99  WHERE id='growth';
UPDATE plans SET price_month=1750, price_month_usd=149.99 WHERE id='scale';
UPDATE plans SET client_access=1 WHERE id <> 'freelance';
ALTER TABLE workspaces ALTER COLUMN plan_id SET DEFAULT 'freelance';
ALTER TABLE workspaces ADD COLUMN cancels INTEGER NOT NULL DEFAULT 0;
"""),
    (14, """
UPDATE plans SET sites=1, members=1, client_access=0, tagline='For a freelancer with a single website' WHERE id='freelance';
"""),
    (15, """
UPDATE plans SET price_month_usd=12.99 WHERE id='freelance';
"""),
    (16, """
ALTER TABLE plans ADD COLUMN one_click_fix INTEGER NOT NULL DEFAULT 0;
UPDATE plans SET one_click_fix=1 WHERE id IN ('starter', 'growth', 'scale');
"""),
    (17, """
CREATE TABLE push_subscriptions (
    id BIGSERIAL PRIMARY KEY, user_id INTEGER NOT NULL, workspace_id INTEGER NOT NULL, endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL, auth TEXT NOT NULL, agent TEXT, created DOUBLE PRECISION NOT NULL
);
CREATE INDEX idx_push_ws ON push_subscriptions(workspace_id);
CREATE INDEX idx_push_user ON push_subscriptions(user_id);
"""),
    (18, """
CREATE TABLE site_events (
    id BIGSERIAL PRIMARY KEY, site_id TEXT NOT NULL, ts DOUBLE PRECISION NOT NULL, who TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL, level TEXT NOT NULL DEFAULT 'info', title TEXT NOT NULL, detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_site_events ON site_events(site_id, ts DESC);
"""),
    (19, """
ALTER TABLE plans ADD COLUMN ai_credits INTEGER NOT NULL DEFAULT 0;
UPDATE plans SET ai_credits=300 WHERE id='starter';
UPDATE plans SET ai_credits=1500 WHERE id='growth';
UPDATE plans SET ai_credits=6000 WHERE id='scale';
ALTER TABLE workspaces ADD COLUMN ai_bonus INTEGER NOT NULL DEFAULT 0;
CREATE TABLE ai_usage (
    id BIGSERIAL PRIMARY KEY, workspace_id BIGINT NOT NULL, site_id TEXT, ts DOUBLE PRECISION NOT NULL, kind TEXT NOT NULL, model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, credits INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_ai_usage_ws ON ai_usage(workspace_id, ts);
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
