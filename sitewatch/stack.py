"""What a website is built with, worked out from its home page and response headers. Saved per website so the dashboard can offer
the right connector (the WordPress plugin, a GitHub pull request for a Next.js app, and so on).

Detection is a best guess from public signals, never a promise: the result carries the signals it used, and a person can correct it."""
import re
import time

from . import db, netguard

WORDPRESS_RE = re.compile(r"/wp-content/|/wp-includes/|wp-json|<meta[^>]+name=[\"']generator[\"'][^>]+WordPress", re.I)
SEO_PLUGINS = (("yoast", re.compile(r"Yoast SEO", re.I)), ("rankmath", re.compile(r"Rank Math", re.I)),
               ("aioseo", re.compile(r"All in One SEO|AIOSEO", re.I)), ("seopress", re.compile(r"SEOPress", re.I)))


def detect(html, headers):
    """-> {"platform": "wordpress" | "nextjs" | "vite" | "shopify" | "vercel" | "netlify" | "unknown", "signals": [...], "seo_plugin": str|None}"""
    h = {k.lower(): v for k, v in (headers or {}).items()}
    signals = []
    if WORDPRESS_RE.search(html) or "api.w.org" in h.get("link", ""):
        signals.append("WordPress files or API link on the home page")
        if re.search(r"""<meta[^>]+name=["']generator["'][^>]+WordPress\s*([\d.]+)""", html, re.I):
            signals.append("generator tag")
        seo = next((name for name, rx in SEO_PLUGINS if rx.search(html)), None)
        return {"platform": "wordpress", "signals": signals, "seo_plugin": seo}
    if "cdn.shopify.com" in html or "x-shopid" in h or "shopify" in h.get("x-powered-by", "").lower():
        return {"platform": "shopify", "signals": ["Shopify CDN or headers"], "seo_plugin": None}
    if "/_next/" in html or "__NEXT_DATA__" in html or "next.js" in h.get("x-powered-by", "").lower():
        return {"platform": "nextjs", "signals": ["Next.js files on the home page"], "seo_plugin": None}
    if re.search(r"""<script[^>]+type=["']module["'][^>]+src=["'][^"']*/assets/index-[\w-]+\.js""", html, re.I) and re.search(r"""id=["']root["']""", html):
        return {"platform": "vite", "signals": ["Vite bundle and a root element"], "seo_plugin": None}
    if "x-vercel-id" in h or h.get("server", "").lower() == "vercel":
        return {"platform": "vercel", "signals": ["Served by Vercel"], "seo_plugin": None}
    if "x-nf-request-id" in h or h.get("server", "").lower() == "netlify":
        return {"platform": "netlify", "signals": ["Served by Netlify"], "seo_plugin": None}
    return {"platform": "unknown", "signals": [], "seo_plugin": None}


def run(site):
    """Fetch the home page and save what it is built with. Returns the saved result."""
    r = netguard.get(site["url"], timeout=12, stream=True, headers={"User-Agent": "SiteRadar-Detect/1.0"})
    html = r.raw.read(1_500_000, decode_content=True).decode("utf-8", "replace")
    headers = dict(r.headers)
    r.close()
    found = {**detect(html, headers), "checked_at": time.time()}
    db.kv_set(f"platform:{site['id']}", found)
    return found


def saved(site_id):
    return db.kv_get(f"platform:{site_id}")


def auto_detect(site, refresh_days=30, retry_hours=6):
    """Works out what a website is built with, without anyone asking: new sites, sites added before detection existed, and a refresh now and then
    (a site can be rebuilt on something else). A failed attempt is retried after a few hours, not on every pass."""
    sid = site["id"]
    now = time.time()
    have = saved(sid)
    if have and now - have.get("checked_at", 0) < refresh_days * 86400:
        return have
    tried = db.kv_get(f"platform-try:{sid}") or {}
    if now - tried.get("at", 0) < retry_hours * 3600:
        return have
    db.kv_set(f"platform-try:{sid}", {"at": now})
    try:
        return run(site)
    except Exception:
        return have
