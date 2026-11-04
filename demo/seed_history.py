"""DEMO ONLY: fills the database with 7 weeks of simulated history so the dashboard and
monthly report have something to show. Never run this against a real installation.

  python demo/seed_history.py demo/config.demo.yaml
"""
import json
import random
import sys
import time
import datetime as dt

sys.path.insert(0, ".")
from sitewatch import config, db

cfg = config.load(sys.argv[1] if len(sys.argv) > 1 else "demo/config.demo.yaml")
db.init(cfg["data_dir"])
site = cfg["sites"][0]["id"]
random.seed(7)
start = dt.datetime(2026, 9, 1).timestamp()
now = time.time() - 3600
conn = db.connect()

# Uptime checks every 5 minutes, two outages and a slow week
outages = [(dt.datetime(2026, 9, 12, 2, 10).timestamp(), 47 * 60, "HTTP 502"),
           (dt.datetime(2026, 9, 23, 14, 5).timestamp(), 12 * 60, "Timed out after 15s"),
           (dt.datetime(2026, 10, 9, 21, 30).timestamp(), 25 * 60, "Connection failed: connection refused")]
rows, t = [], start
while t < now:
    down = next((o for o in outages if o[0] <= t < o[0] + o[1]), None)
    day = dt.datetime.fromtimestamp(t)
    base = 420 if day.month == 9 else 360
    if dt.datetime(2026, 9, 15) <= day < dt.datetime(2026, 9, 20):
        base = 1150
    ms = int(random.gauss(base, base * 0.18) + (180 if 9 <= day.hour <= 17 else 0))
    rows.append((site, t, 0 if down else 1, 502 if down and "502" in down[2] else (None if down else 200),
                 None if down else max(80, ms), down[2] if down else None, 64 - int((t - start) / 86400)))
    t += 300
conn.executemany("INSERT INTO checks(site_id, ts, ok, status_code, response_ms, error, ssl_days_left) VALUES (?,?,?,?,?,?,?)", rows)
for s, dur, cause in outages:
    conn.execute("INSERT INTO incidents(site_id, started, ended, cause) VALUES (?,?,?,?)", (site, s, s + dur, cause))

# Analytics: weekday-heavy traffic, growing in October
pages = [("/", 40), ("/menu", 25), ("/About_Us", 10), ("/contact", 12), ("/privacy", 2), ("/blog/old-post", 3)]
refs = [("", 45), ("google.com", 30), ("instagram.com", 10), ("facebook.com", 6), ("bing.com", 3), ("tripadvisor.nl", 6)]
devs = [("Mobile", "Safari", "iOS", 390), ("Mobile", "Chrome", "Android", 412), ("Desktop", "Chrome", "Windows", 1440),
        ("Desktop", "Safari", "macOS", 1512), ("Desktop", "Edge", "Windows", 1366), ("Tablet", "Safari", "iOS", 820)]
devw = [32, 26, 22, 10, 6, 4]
pick = lambda opts: random.choices([o[0] for o in opts], [o[1] for o in opts])[0]
hits, d = [], dt.datetime(2026, 9, 1)
while d.timestamp() < now:
    n = int((38 if d.month == 9 else 47) * (1.25 if d.weekday() >= 5 else 1) * random.uniform(.8, 1.2))
    for v in range(n):
        vid = f"{random.getrandbits(48):012x}"
        dev = random.choices(devs, devw)[0]
        ts = d.timestamp() + random.uniform(7, 22) * 3600
        ref = pick(refs)
        utm = ("newsletter", "email", "oct-autumn") if d.month == 10 and random.random() < .06 else (None, None, None)
        for k in range(random.choices([1, 2, 3, 4], [55, 25, 12, 8])[0]):
            path = pick(pages) if k else ("/" if random.random() < .6 else pick(pages))
            load = int(random.gauss(3400 if path == "/menu" else 1500, 300) * (1.4 if dev[0] == "Mobile" else 1))
            if ts < now:
                hits.append((site, ts, path, ref if k == 0 else "", vid, *dev, *(utm if k == 0 else (None, None, None)), load))
            ts += random.uniform(20, 240)
    d += dt.timedelta(days=1)
conn.executemany("""INSERT INTO hits(site_id, ts, path, referrer, visitor, device, browser, os, screen,
                    utm_source, utm_medium, utm_campaign, load_ms) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", hits)

# An older audit (early September) so the report can show what changed
latest = db.latest_audit(site)
if latest:
    old = [i for i in latest["issues"] if i["rule"] not in ("img_alt",)]
    old.append({"rule": "exposed_files", "category": "Security", "severity": "high",
                "title": "Sensitive files publicly accessible", "fix": "Block public access to these files.",
                "count": 1, "examples": [{"url": "http://127.0.0.1:9000/.env", "detail": ""}], "share": .2})
    scores = dict(latest["scores"], Security=latest["scores"]["Security"] - 15, Overall=latest["scores"]["Overall"] - 4)
    for when in (dt.datetime(2026, 8, 31, 3), dt.datetime(2026, 9, 30, 3)):
        conn.execute("INSERT INTO audits(site_id, ts, pages, scores, issues) VALUES (?,?,?,?,?)",
                     (site, when.timestamp(), latest["pages"], json.dumps(scores), json.dumps(old)))
conn.commit()
print(f"Seeded {len(rows)} checks, {len(hits)} page views, {len(outages)} incidents.")
