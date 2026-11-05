"""One-off copy of an old SQLite database (data/sitewatch.db) into Postgres.

Run it once after switching a deployment to Postgres:
    python -m sitewatch migrate-sqlite /app/data/sitewatch.db
Tables that already hold rows in Postgres are left alone, so it is safe to run twice.
"""
import json
import os
import sqlite3

from . import db

TABLES = ["sites", "checks", "incidents", "hits", "audits", "alerts_sent", "subscriptions", "invoices",
          "domain_checks", "dns_snapshots", "sitemap_snapshots"]
BATCH = 2000


def migrate(path, data_dir):
    if not os.path.exists(path):
        raise SystemExit(f"No SQLite database at {path}")
    src = sqlite3.connect(path)
    have = {r[0] for r in src.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    with db._pool.connection() as c:
        for table in TABLES:
            if table not in have:
                continue
            if c.execute(f"SELECT 1 FROM {table} LIMIT 1").fetchone():
                print(f"{table}: already has data in Postgres, skipped")
                continue
            src_cols = [r[1] for r in src.execute(f"PRAGMA table_info({table})")]
            dst_cols = {r["column_name"] for r in c.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table,)).fetchall()}
            cols = [x for x in src_cols if x in dst_cols]
            insert = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})"
            cur = src.execute(f"SELECT {', '.join(cols)} FROM {table}")
            copied = 0
            while True:
                rows = cur.fetchmany(BATCH)
                if not rows:
                    break
                with c.transaction():
                    with c.cursor() as cc:
                        cc.executemany(insert, [tuple(r) for r in rows])
                copied += len(rows)
            if "id" in cols and table != "sites":
                c.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM {table}))")
            print(f"{table}: copied {copied} rows")
    state_file = os.path.join(data_dir, "state.json")
    if db.kv_get("scheduler") is None and os.path.exists(state_file):
        db.kv_set("scheduler", json.load(open(state_file)))
        print("scheduler state: copied")
    print("Done. Keep the SQLite file as a backup until you have checked the dashboard.")
