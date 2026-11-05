"""DNS records snapshot, change detection and email-authentication (SPF, DKIM, DMARC) checks."""
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor

import dns.exception
import dns.resolver

log = logging.getLogger("sitewatch.dns")
DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "k2", "mail", "s1", "s2", "dkim", "zoho", "mandrill", "smtp"]


def _resolver(domain):
    """The server's own resolver first, then public ones. Whichever answers a real query is used."""
    for servers in (None, ["1.1.1.1", "8.8.8.8", "9.9.9.9"]):
        try:
            r = dns.resolver.Resolver(configure=servers is None)
            if servers:
                r.nameservers = servers
            r.lifetime = 4
            r.resolve(domain, "NS")
            return r
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            return r
        except Exception as e:
            log.info("Resolver %s failed: %s", servers or "system", e)
    raise RuntimeError("DNS lookups failed: no resolver answered")


def _query(res, name, rtype):
    try:
        return sorted(str(a).strip() for a in res.resolve(name, rtype))
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        return []
    except dns.exception.DNSException as e:
        log.info("DNS %s %s failed: %s", name, rtype, e)
        return None          # lookup failed, unlike an empty answer


def _txt(res, name):
    out = _query(res, name, "TXT")
    return None if out is None else [t.replace('" "', "").strip('"') for t in out]


def fetch(domain):
    res = _resolver(domain)
    jobs = {t: (domain, t) for t in ("A", "AAAA", "MX", "NS", "CAA")}
    jobs["TXT"] = (domain, "TXT")
    jobs["WWW_CNAME"] = ("www." + domain, "CNAME")
    jobs["WWW_A"] = ("www." + domain, "A")
    jobs["DMARC"] = ("_dmarc." + domain, "TXT")
    for sel in DKIM_SELECTORS:
        jobs["DKIM:" + sel] = (f"{sel}._domainkey.{domain}", "TXT")
    with ThreadPoolExecutor(8) as ex:
        futs = {k: ex.submit(_txt if t == "TXT" else _query, res, n, *(() if t == "TXT" else (t,))) for k, (n, t) in jobs.items()}
        raw = {k: f.result() for k, f in futs.items()}
    rec = {k: raw[k] for k in ("A", "AAAA", "MX", "NS", "CAA", "TXT", "DMARC")}
    rec["WWW"] = raw["WWW_CNAME"] or raw["WWW_A"]
    rec["DKIM"] = [k.split(":", 1)[1] for k, v in raw.items() if k.startswith("DKIM:") and v]
    if all(rec[k] is None for k in ("A", "NS", "MX")):
        raise RuntimeError("DNS lookups failed (no answer from the resolvers)")
    return {k: (v or []) for k, v in rec.items()}


def checks(rec):
    """List of {id, label, status ok|warn|bad|na, detail, fix} for the checklist and the report."""
    out = []

    def add(id_, label, status, detail, fix=""):
        out.append({"id": id_, "label": label, "status": status, "detail": detail, "fix": fix})

    has_web = bool(rec["A"] or rec["AAAA"])
    add("web", "Domain points to a web server", "ok" if has_web else "bad",
        ", ".join(rec["A"] + rec["AAAA"]) if has_web else "No A or AAAA record on the main domain.",
        "" if has_web else "Add an A record for the domain at your DNS provider, pointing to your hosting.")
    ns = rec["NS"]
    add("ns", "At least two name servers", "ok" if len(ns) >= 2 else "warn", f"{len(ns)} name server(s)",
        "" if len(ns) >= 2 else "Use a DNS provider with two or more name servers so one failure does not take the site down.")
    add("www", "www version of the domain resolves", "ok" if rec["WWW"] else "warn",
        ", ".join(rec["WWW"]) if rec["WWW"] else "No record for www.",
        "" if rec["WWW"] else "Add a www CNAME record pointing to the main domain, or visitors typing www will see an error.")

    has_mail = bool(rec["MX"])
    add("mx", "Email is set up (MX records)", "ok" if has_mail else "na",
        ", ".join(rec["MX"]) if has_mail else "No MX records. Fine if this domain does not use email.")

    spf = [t for t in rec["TXT"] if t.lower().startswith("v=spf1")]
    if not has_mail:
        add("spf", "SPF (who may send your email)", "na", "Not needed without email.")
    elif not spf:
        add("spf", "SPF (who may send your email)", "bad", "No SPF record.",
            "Add a TXT record listing your email provider, for example v=spf1 include:_spf.google.com ~all, so your email is not marked as spam.")
    elif len(spf) > 1:
        add("spf", "SPF (who may send your email)", "bad", "More than one SPF record.", "Merge them into a single SPF TXT record. Two records make SPF fail.")
    elif re.search(r"\+all\b", spf[0]) or spf[0].strip().endswith(" all"):
        add("spf", "SPF (who may send your email)", "bad", "SPF allows anyone to send as you.", "Change the ending to ~all or -all.")
    else:
        add("spf", "SPF (who may send your email)", "ok", "-all (strict)" if "-all" in spf[0] else "Present, soft fail (~all)")

    dmarc = [t for t in rec["DMARC"] if t.lower().startswith("v=dmarc1")]
    if not has_mail:
        add("dmarc", "DMARC (protects against email spoofing)", "na", "Not needed without email.")
    elif not dmarc:
        add("dmarc", "DMARC (protects against email spoofing)", "bad", "No DMARC record.",
            "Add a TXT record at _dmarc with v=DMARC1; p=none; rua=mailto:you@yourdomain to start, then move to p=quarantine once reports look clean.")
    else:
        policy = (re.search(r"\bp=(\w+)", dmarc[0]) or [None, "none"])[1].lower()
        add("dmarc", "DMARC (protects against email spoofing)", "ok" if policy in ("quarantine", "reject") else "warn",
            f"Policy: {policy}",
            "" if policy in ("quarantine", "reject") else "The policy is p=none, which only monitors. Move to quarantine or reject once legitimate email passes.")

    if not has_mail:
        add("dkim", "DKIM (signs your email)", "na", "Not needed without email.")
    elif rec["DKIM"]:
        add("dkim", "DKIM (signs your email)", "ok", "Found for: " + ", ".join(rec["DKIM"]))
    else:
        add("dkim", "DKIM (signs your email)", "warn", "Not found under the common selector names.",
            "Check with your email provider (Google Workspace, Microsoft 365, etc.) that DKIM signing is switched on. Providers can use a custom selector this check cannot guess.")

    add("caa", "CAA (who may issue SSL certificates)", "ok" if rec["CAA"] else "warn",
        ", ".join(rec["CAA"]) if rec["CAA"] else "No CAA record.",
        "" if rec["CAA"] else "Optional hardening: add a CAA record so only your certificate provider can issue certificates for the domain.")
    return out


def score(chk):
    rated = [c for c in chk if c["status"] != "na"]
    if not rated:
        return None
    pts = sum({"ok": 1, "warn": 0.5, "bad": 0}[c["status"]] for c in rated)
    return round(100 * pts / len(rated))


WATCHED = ("A", "AAAA", "MX", "NS", "CAA")


def diff(old, new):
    """Changes between two record snapshots, ready to show and alert on."""
    out = []
    for k in WATCHED:
        if sorted(old.get(k, [])) != sorted(new.get(k, [])):
            out.append({"record": k, "before": old.get(k, []), "after": new.get(k, [])})
    spf = lambda r: [t for t in r.get("TXT", []) if t.lower().startswith("v=spf1")]
    dm = lambda r: [t for t in r.get("DMARC", []) if t.lower().startswith("v=dmarc1")]
    for name, f in (("SPF", spf), ("DMARC", dm)):
        if f(old) != f(new):
            out.append({"record": name, "before": f(old), "after": f(new)})
    return out


def dumps(x):
    return json.dumps(x, separators=(",", ":"))
