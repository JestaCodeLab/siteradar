"""Sitemap monitoring: find it, read it, spot-check the URLs in it, and track changes."""
import gzip
import logging
import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse

import requests

from . import netguard

log = logging.getLogger("sitewatch.sitemap")
UA = {"User-Agent": "Mozilla/5.0 (compatible; SiteRadar-Sitemap/1.0)"}
MAX_URLS = 5000
SAMPLE = 50


def _get(url, timeout=15):
    return netguard.get(url, headers=UA, timeout=timeout, allow_redirects=True)


def _tag(el):
    return el.tag.rsplit("}", 1)[-1]


def _parse(url):
    r = _get(url)
    r.raise_for_status()
    body = r.content
    if url.endswith(".gz") or body[:2] == b"\x1f\x8b":
        body = gzip.decompress(body)
    return ET.fromstring(body)


def discover(base):
    """Sitemap URLs from robots.txt, else the usual places."""
    found = []
    try:
        r = _get(urljoin(base + "/", "robots.txt"), 10)
        if r.ok:
            found = re.findall(r"(?im)^\s*sitemap:\s*(\S+)", r.text)
    except requests.RequestException:
        pass
    if found:
        return found
    for path in ("/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap.xml.gz"):
        try:
            r = netguard.head(base + path, headers=UA, timeout=10, allow_redirects=True)
            if r.status_code == 200:
                return [base + path]
        except requests.RequestException:
            continue
    return []


def collect(sitemaps):
    urls, seen, queue, errors = [], set(), list(sitemaps), []
    while queue and len(seen) < 25 and len(urls) < MAX_URLS:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        try:
            root = _parse(sm)
        except Exception as e:
            errors.append(f"{sm}: {e}")
            continue
        for child in root:
            kind = _tag(child)                      # "url" for pages, "sitemap" for a child sitemap
            for el in child:
                if _tag(el) == "loc" and el.text:
                    (queue if kind == "sitemap" else urls).append(el.text.strip())
    return list(dict.fromkeys(urls))[:MAX_URLS], errors


def _status(url):
    try:
        r = netguard.get(url, headers=UA, timeout=12, allow_redirects=False, stream=True)
        code = r.status_code
        r.close()
        return url, code
    except requests.RequestException as e:
        return url, str(type(e).__name__)


def run(site, previous_urls=None):
    base = site["url"].rstrip("/")
    host = urlparse(base).netloc.removeprefix("www.")
    sitemaps = discover(base)
    if not sitemaps:
        return {"sitemap_url": None, "total": 0, "checked": 0, "broken": [], "redirects": 0, "urls": [],
                "added": None, "removed": None, "foreign": 0, "insecure": 0,
                "error": "No sitemap found. Search engines find pages faster with one."}
    urls, errors = collect(sitemaps)
    if not urls:
        return {"sitemap_url": sitemaps[0], "total": 0, "checked": 0, "broken": [], "redirects": 0, "urls": [],
                "added": None, "removed": None, "foreign": 0, "insecure": 0,
                "error": errors[0] if errors else "The sitemap is empty."}
    step = max(1, len(urls) // SAMPLE)
    sample = urls[::step][:SAMPLE]
    with ThreadPoolExecutor(8) as ex:
        results = list(ex.map(_status, sample))
    broken = [{"url": u, "status": c} for u, c in results if not (isinstance(c, int) and c < 400) and not (isinstance(c, int) and 300 <= c < 400)]
    redirects = sum(1 for _, c in results if isinstance(c, int) and 300 <= c < 400)
    cur = set(urls)
    prev = set(previous_urls) if previous_urls is not None else None
    return {
        "sitemap_url": sitemaps[0], "total": len(urls), "checked": len(sample), "broken": broken[:20],
        "redirects": redirects, "urls": urls,
        "added": len(cur - prev) if prev is not None else None,
        "removed": len(prev - cur) if prev is not None else None,
        "foreign": sum(1 for u in urls if urlparse(u).netloc.removeprefix("www.") != host),
        "insecure": sum(1 for u in urls if u.startswith("http://")),
        "error": None if not errors else errors[0],
    }
