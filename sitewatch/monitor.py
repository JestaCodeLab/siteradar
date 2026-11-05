"""Uptime monitoring: HTTP status, response time, keyword presence, SSL certificate expiry.

Incidents open after `failures_before_alert` consecutive failures (avoids alerting on a
single network blip) and close on the first successful check, with a recovery alert.
"""
import datetime as dt
import logging
import os
import socket
import ssl
import time
from urllib.parse import urlparse

import requests

from . import alerts, db

log = logging.getLogger("sitewatch.monitor")
UA = "SiteWatch-Monitor/1.0 (+uptime check)"


def ssl_info(url, timeout=10):
    """(days left, expiry date as YYYY-MM-DD), or None for sites without https."""
    u = urlparse(url)
    if u.scheme != "https":
        return None
    host, port = u.hostname, u.port or 443
    ctx = ssl.create_default_context()
    with socket.create_connection((host, port), timeout=timeout) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as s:
            cert = s.getpeercert()
    expires = dt.datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=dt.timezone.utc)
    return (expires - dt.datetime.now(dt.timezone.utc)).days, expires.date().isoformat()


def ssl_days_left(url, timeout=10):
    info = ssl_info(url, timeout)
    return info[0] if info else None


def check_site(cfg, site):
    """Run one check, store it, and handle incidents/alerts. Returns the check dict."""
    result = {"ok": False, "status_code": None, "response_ms": None, "error": None, "ssl_days_left": None, "ssl_expires": None}
    start = time.perf_counter()
    try:
        r = requests.get(site["url"], timeout=cfg["timeout_seconds"],
                         headers={"User-Agent": UA}, allow_redirects=True)
        result["response_ms"] = int((time.perf_counter() - start) * 1000)
        result["status_code"] = r.status_code
        if r.status_code >= 400:
            result["error"] = f"HTTP {r.status_code}"
        elif site.get("keyword") and site["keyword"] not in r.text:
            result["error"] = f"Expected text '{site['keyword']}' not found on page"
        else:
            result["ok"] = True
    except requests.exceptions.SSLError as e:
        result["error"] = f"SSL error: {str(e)[:150]}"
    except requests.exceptions.Timeout:
        result["error"] = f"Timed out after {cfg['timeout_seconds']}s"
    except requests.exceptions.ConnectionError as e:
        result["error"] = f"Connection failed: {str(e)[:150]}"
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)[:150]}"

    try:
        info = ssl_info(site["url"])
        if info:
            result["ssl_days_left"], result["ssl_expires"] = info
    except Exception:
        pass

    now = time.time()
    db.run("INSERT INTO checks(site_id, ts, ok, status_code, response_ms, error, ssl_days_left, ssl_expires) VALUES (?,?,?,?,?,?,?,?)",
           (site["id"], now, int(result["ok"]), result["status_code"], result["response_ms"],
            result["error"], result["ssl_days_left"], result["ssl_expires"]))
    _handle_incidents(cfg, site, result, now)
    _handle_warnings(cfg, site, result)
    return result


def _handle_incidents(cfg, site, result, now):
    incident = db.open_incident(site["id"])
    if result["ok"]:
        if incident:
            db.run("UPDATE incidents SET ended=? WHERE id=?", (now, incident["id"]))
            mins = (now - incident["started"]) / 60
            alerts.notify(cfg, site, f"RECOVERED: {site['name']} is back up",
                          f"{site['url']} is responding again (HTTP {result['status_code']}, "
                          f"{result['response_ms']} ms).\nDowntime: {mins:.0f} minutes.\nCause was: {incident['cause']}",
                          sms_text=f"SiteWatch: {site['name']} is back up after {mins:.0f} min.", event="up")
        return
    if incident:
        return
    n = max(1, int(cfg["failures_before_alert"]))
    recent = db.q("SELECT ok, ts FROM checks WHERE site_id=? ORDER BY ts DESC LIMIT ?", (site["id"], n))
    if len(recent) >= n and all(not r["ok"] for r in recent):
        started = recent[-1]["ts"]   # downtime began at the first failed check
        db.run("INSERT INTO incidents(site_id, started, cause) VALUES (?,?,?)", (site["id"], started, result["error"]))
        alerts.notify(cfg, site, f"DOWN: {site['name']}",
                      f"{site['url']} failed {n} checks in a row.\nReason: {result['error']}\n"
                      f"Dashboard: {os.environ.get('APP_URL', cfg['public_url']).rstrip('/')}/websites/{site['id']}",
                      sms_text=f"SiteWatch: {site['name']} is DOWN. {result['error']}", event="down")


def _handle_warnings(cfg, site, result):
    """Non-outage warnings, sent at most once a day each."""
    def once_a_day(kind, subject, text):
        last = db.last_alert(site["id"], kind)
        if not last or time.time() - last["ts"] > 86400:
            db.log_alert(site["id"], kind, subject)
            alerts.notify(cfg, site, subject, text, event=kind)

    days = result["ssl_days_left"]
    if days is not None and days <= cfg["ssl_warning_days"]:
        once_a_day("ssl", f"SSL certificate for {site['name']} expires in {days} days",
                   f"Renew the certificate for {site['url']} before it expires, or visitors will see a security warning.")
    if result["ok"] and result["response_ms"]:
        recent = db.q("SELECT response_ms FROM checks WHERE site_id=? AND ok=1 ORDER BY ts DESC LIMIT 3", (site["id"],))
        if len(recent) == 3 and all(r["response_ms"] > cfg["slow_threshold_ms"] for r in recent):
            once_a_day("slow", f"SLOW: {site['name']} is responding slowly",
                       f"The last 3 checks took over {cfg['slow_threshold_ms']} ms "
                       f"(latest {result['response_ms']} ms). Check hosting load, caching and the database.")


def check_all(cfg):
    out = {}
    for site in cfg["sites"]:
        try:
            out[site["id"]] = check_site(cfg, site)
        except Exception as e:
            log.exception("Check crashed for %s: %s", site["id"], e)
    return out


# ---- statistics used by dashboard and reports ---------------------------

def uptime_stats(site_id, since, until=None):
    until = until or time.time()
    row = db.q1("""SELECT COUNT(*) n, SUM(ok) up, AVG(CASE WHEN ok=1 THEN response_ms END) avg_ms
                   FROM checks WHERE site_id=? AND ts>=? AND ts<?""", (site_id, since, until))
    incidents = db.q("""SELECT * FROM incidents WHERE site_id=? AND started<? AND (ended IS NULL OR ended>=?)
                        ORDER BY started""", (site_id, until, since))
    down_secs = 0
    for i in incidents:
        down_secs += min(i["ended"] or until, until) - max(i["started"], since)
    period = until - since
    times = [r["response_ms"] for r in db.q(
        "SELECT response_ms FROM checks WHERE site_id=? AND ts>=? AND ts<? AND ok=1 ORDER BY response_ms",
        (site_id, since, until))]
    p95 = times[int(len(times) * 0.95) - 1] if times else None
    if row["n"]:
        # Uptime is time-based (incident durations), so a single blip that never became
        # an incident doesn't count as downtime.
        uptime = max(0.0, 100 * (1 - down_secs / period)) if period else 100.0
    else:
        uptime = None
    return {
        "checks": row["n"], "uptime": uptime,
        "avg_ms": round(row["avg_ms"]) if row["avg_ms"] else None, "p95_ms": p95,
        "incidents": incidents, "downtime_minutes": round(down_secs / 60, 1),
    }


def daily_series(site_id, since, until):
    """Per-day uptime % (check-based) and average response time, for charts."""
    rows = db.q("""SELECT to_char(to_timestamp(ts) AT TIME ZONE ?, 'YYYY-MM-DD') d, COUNT(*) n, SUM(ok) up,
                          AVG(CASE WHEN ok=1 THEN response_ms END) ms
                   FROM checks WHERE site_id=? AND ts>=? AND ts<? GROUP BY d ORDER BY d""",
                (db.TZ, site_id, since, until))
    return [{"day": r["d"], "uptime": 100 * r["up"] / r["n"], "avg_ms": round(r["ms"] or 0)} for r in rows]
