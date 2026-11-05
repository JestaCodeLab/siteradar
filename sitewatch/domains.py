"""Domain expiry from RDAP, the free registry lookup that replaced WHOIS."""
import datetime as dt
import logging
import time

import requests
import tldextract

log = logging.getLogger("sitewatch.domains")
_extract = tldextract.TLDExtract(suffix_list_urls=())      # bundled list, no network call
_bootstrap = {"ts": 0, "map": {}}
UA = {"User-Agent": "SiteRadar/1.0 (domain expiry check)", "Accept": "application/rdap+json, application/json"}


def registrable(url_or_host):
    host = url_or_host.split("//")[-1].split("/")[0].split(":")[0]
    ext = _extract(host)
    return getattr(ext, "top_domain_under_public_suffix", None) or ext.registered_domain or host


def _servers():
    if time.time() - _bootstrap["ts"] > 86400 or not _bootstrap["map"]:
        try:
            data = requests.get("https://data.iana.org/rdap/dns.json", timeout=15, headers=UA).json()
            m = {}
            for tlds, urls in data["services"]:
                for t in tlds:
                    m[t.lower()] = urls
            _bootstrap.update(ts=time.time(), map=m)
        except Exception as e:
            log.warning("RDAP bootstrap failed: %s", e)
    return _bootstrap["map"]


def lookup(domain):
    """Returns {expires: 'YYYY-MM-DD'|None, registrar, status: ok|unsupported|error, error}."""
    tld = domain.rsplit(".", 1)[-1].lower()
    bases = list(_servers().get(tld, []))
    if not bases:
        bases = ["https://rdap.org/"]
    last = None
    for base in bases:
        try:
            r = requests.get(base.rstrip("/") + "/domain/" + domain, timeout=20, headers=UA, allow_redirects=True)
            if r.status_code == 404:
                return {"expires": None, "registrar": None, "status": "unsupported",
                        "error": "This domain extension doesn't publish its expiry date."}
            r.raise_for_status()
            data = r.json()
            expires = None
            for ev in data.get("events", []):
                if ev.get("eventAction") == "expiration":
                    expires = ev["eventDate"][:10]
            registrar = None
            for ent in data.get("entities", []):
                if "registrar" in ent.get("roles", []):
                    for item in (ent.get("vcardArray") or [None, []])[1]:
                        if item[0] == "fn":
                            registrar = item[3]
            if not expires:
                return {"expires": None, "registrar": registrar, "status": "unsupported",
                        "error": "The registry didn't return an expiry date."}
            return {"expires": expires, "registrar": registrar, "status": "ok", "error": None}
        except Exception as e:
            last = str(e)
    return {"expires": None, "registrar": None, "status": "error", "error": f"Lookup failed: {last}"}


def days_left(expires):
    return (dt.date.fromisoformat(expires) - dt.date.today()).days if expires else None
