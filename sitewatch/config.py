"""Load and validate config.yaml. Environment variables like ${SMTP_PASSWORD} are expanded."""
import os
import re
import yaml

DEFAULTS = {
    "data_dir": "data",
    "public_url": "http://localhost:8080",
    "check_interval_minutes": 5,
    "failures_before_alert": 2,
    "timeout_seconds": 15,
    "slow_threshold_ms": 3000,
    "ssl_warning_days": 21,
    "audit": {"max_pages": 50, "daily_at": "03:00"},
    "report": {"day_of_month": 1, "at": "07:00"},
    "alerts": {},
    "pagespeed_api_key": "",
    "database_url": "",                  # Postgres connection string (Railway sets DATABASE_URL)
    "health": {"daily_at": "03:30"},     # domain expiry, DNS and sitemap checks
}

SITE_DEFAULTS = {
    "keyword": None,          # text that must appear on the page
    "track_analytics": True,
    "audit": True,
    "report_to": [],          # emails that receive the monthly report
    "owner": "",              # e.g. "Client: Acme BV"
}

_env = re.compile(r"\$\{([A-Z0-9_]+)\}")


def _expand(value):
    if isinstance(value, str):
        return _env.sub(lambda m: os.environ.get(m.group(1), ""), value)
    if isinstance(value, dict):
        return {k: _expand(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_expand(v) for v in value]
    return value


def _slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def load(path="config.yaml"):
    with open(path) as f:
        raw = _expand(yaml.safe_load(f) or {})
    cfg = {**DEFAULTS, **{k: v for k, v in raw.items() if k != "sites"}}
    for key in ("audit", "report", "health"):
        cfg[key] = {**DEFAULTS[key], **(raw.get(key) or {})}
    sites = []
    for s in raw.get("sites") or []:
        if "url" not in s:
            raise ValueError(f"Site entry is missing 'url': {s}")
        site = {**SITE_DEFAULTS, **s}
        site["url"] = site["url"].rstrip("/") or site["url"]
        site.setdefault("name", site["url"].split("//")[-1])
        site.setdefault("id", _slug(site["name"]))
        sites.append(site)
    ids = [s["id"] for s in sites]
    if len(ids) != len(set(ids)):
        raise ValueError("Two sites share the same id; give them unique 'id' values.")
    cfg["sites"] = sites
    if os.environ.get("PUBLIC_URL"):                 # lets local runs override the address in config.yaml
        cfg["public_url"] = os.environ["PUBLIC_URL"].rstrip("/")
    os.makedirs(cfg["data_dir"], exist_ok=True)
    return cfg


def get_site(cfg, site_id):
    for s in cfg["sites"]:
        if s["id"] == site_id:
            return s
    return None
