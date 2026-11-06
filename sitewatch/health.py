"""Domain expiry, DNS and sitemap checks: run them, store the results, alert on problems."""
import json
import logging
import time

from . import accounts, alerts, db, dnshealth, domains, emails, screenshot, sitemap

log = logging.getLogger("sitewatch.health")
DOMAIN_ALERT_DAYS = (60, 30, 14, 7, 3, 1)


def _once(site, kind, subject, text, cfg, mail=None):
    if db.last_alert(site["id"], kind):
        return
    db.log_alert(site["id"], kind, subject)
    alerts.notify(cfg, site, subject, text, event="domain", mail=mail)


def _domain_mail(site, domain, left, expires, registrar):
    ws = accounts.workspace(site.get("workspace_id")) or {}
    return emails.expiry("domain", ws.get("name", "your workspace"), domain, left, emails.fmt_date(expires),
                         f"{emails.app_url()}/websites/{site['id']}", registrar=registrar)


def check_domain(cfg, site):
    domain = domains.registrable(site["url"])
    res = domains.lookup(domain)
    db.run("INSERT INTO domain_checks(site_id, domain, ts, expires, registrar, status, error) VALUES (?,?,?,?,?,?,?)",
           (site["id"], domain, time.time(), res["expires"], res["registrar"], res["status"], res["error"]))
    left = domains.days_left(res["expires"])
    if left is not None:
        if left < 0:
            _once(site, f"domain:expired:{res['expires']}", f"DOMAIN EXPIRED: {domain}",
                  f"{domain} expired on {res['expires']}. Renew it immediately or the website and email will stop working.", cfg,
                  _domain_mail(site, domain, left, res["expires"], res["registrar"]))
        else:
            due = [d for d in DOMAIN_ALERT_DAYS if left <= d]
            if due:
                _once(site, f"domain:{res['expires']}:{min(due)}", f"Domain {domain} expires in {left} days",
                      f"{domain} expires on {res['expires']}. Renew it with {res['registrar'] or 'your registrar'} before then.", cfg,
                      _domain_mail(site, domain, left, res["expires"], res["registrar"]))
    return res


def check_dns(cfg, site):
    domain = domains.registrable(site["url"])
    rec = dnshealth.fetch(domain)
    chk = dnshealth.checks(rec)
    prev = db.q1("SELECT * FROM dns_snapshots WHERE site_id=? ORDER BY ts DESC LIMIT 1", (site["id"],))
    changes = dnshealth.diff(json.loads(prev["records"]), rec) if prev else []
    db.run("INSERT INTO dns_snapshots(site_id, ts, records, checks, changes) VALUES (?,?,?,?,?)",
           (site["id"], time.time(), dnshealth.dumps(rec), dnshealth.dumps(chk), dnshealth.dumps(changes)))
    if changes:
        lines = "\n".join(f"- {c['record']}: {', '.join(c['before']) or 'none'} → {', '.join(c['after']) or 'none'}" for c in changes)
        alerts.notify(cfg, site, f"DNS changed for {domain}",
                      f"The DNS records for {domain} changed:\n{lines}\n\nIf you did not make this change, check with your DNS provider straight away.", event="dns")
        db.log_alert(site["id"], "dns", f"DNS records changed for {domain}")
    return rec, chk, changes


def check_sitemap(cfg, site):
    prev = db.q1("SELECT id, urls FROM sitemap_snapshots WHERE site_id=? ORDER BY ts DESC LIMIT 1", (site["id"],))
    res = sitemap.run(site, json.loads(prev["urls"]) if prev and prev["urls"] else None)
    db.run("""INSERT INTO sitemap_snapshots(site_id, ts, sitemap_url, total, checked, broken, redirects, added, removed, urls, error)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
           (site["id"], time.time(), res["sitemap_url"], res["total"], res["checked"], json.dumps(res["broken"]),
            res["redirects"], res["added"], res["removed"], json.dumps(res["urls"]), res["error"]))
    if prev:
        db.run("UPDATE sitemap_snapshots SET urls=NULL WHERE id=?", (prev["id"],))     # keep only the latest URL list
    return res


def check_screenshot(cfg, site):
    return screenshot.capture(cfg, site)


def run_all(cfg, site):
    """Everything for one site. One part failing never stops the others."""
    for fn in (check_domain, check_dns, check_sitemap, check_screenshot):
        try:
            fn(cfg, site)
        except Exception as e:
            log.warning("%s failed for %s: %s", fn.__name__, site["id"], e)


def needs_first_run(cfg, site_id):
    """New sites, and existing ones that have not had a preview picture yet."""
    return (not db.q1("SELECT 1 FROM domain_checks WHERE site_id=? LIMIT 1", (site_id,))
            or screenshot.captured_at(cfg, site_id) is None)


def latest(site_id):
    d = db.q1("SELECT * FROM domain_checks WHERE site_id=? ORDER BY ts DESC LIMIT 1", (site_id,))
    if d:
        d["days_left"] = domains.days_left(d["expires"])
    dns_row = db.q1("SELECT * FROM dns_snapshots WHERE site_id=? ORDER BY ts DESC LIMIT 1", (site_id,))
    dns_out = None
    if dns_row:
        chk = json.loads(dns_row["checks"])
        history = db.q("SELECT ts, changes FROM dns_snapshots WHERE site_id=? AND changes != '[]' ORDER BY ts DESC LIMIT 10", (site_id,))
        dns_out = {"ts": dns_row["ts"], "records": json.loads(dns_row["records"]), "checks": chk,
                   "score": dnshealth.score(chk),
                   "history": [{"ts": h["ts"], "changes": json.loads(h["changes"])} for h in history]}
    s = db.q1("SELECT * FROM sitemap_snapshots WHERE site_id=? ORDER BY ts DESC LIMIT 1", (site_id,))
    sm = None
    if s:
        sm = {k: s[k] for k in ("ts", "sitemap_url", "total", "checked", "redirects", "added", "removed", "error")}
        sm["broken"] = json.loads(s["broken"] or "[]")
        trend = db.q("SELECT ts, total FROM sitemap_snapshots WHERE site_id=? ORDER BY ts DESC LIMIT 30", (site_id,))
        sm["trend"] = [{"ts": t["ts"], "total": t["total"]} for t in trend[::-1]]
    return {"domain": d, "dns": dns_out, "sitemap": sm}
