"""Homepage preview images (desktop and phone), captured with the same headless Chrome that makes the PDFs."""
import ipaddress
import logging
import os
import socket
import threading
import time
from urllib.parse import urlparse

from . import storage

log = logging.getLogger("sitewatch.screenshot")
DEVICES = {
    "desktop": {"viewport": {"width": 1280, "height": 800}, "mobile": False},
    "mobile": {"viewport": {"width": 390, "height": 844}, "mobile": True},
}
_lock = threading.Lock()          # one Chrome at a time keeps memory use small


def key(site_id, device):
    return f"shot/{site_id}-{device}.jpg"


def captured_at(cfg, site_id, device="desktop"):
    row = storage.info(key(site_id, device))
    return row["ts"] if row else None


def image(cfg, site_id, device):
    return storage.get(key(site_id, device), os.path.join(cfg["data_dir"], "screenshots", f"{site_id}-{device}.jpg"))


def _public(url):
    """Refuse addresses that point inside our own network."""
    host = urlparse(url).hostname or ""
    try:
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if not ip.is_global:
                return False
    except (socket.gaierror, ValueError):
        return False
    return True


_seen = {}


def _only_public(route):
    """Lets a browser request through only when its host resolves to public addresses."""
    url = route.request.url
    if url.startswith(("data:", "blob:", "about:")):
        return route.continue_()
    host = urlparse(url).hostname or ""
    if host not in _seen:
        _seen[host] = _public(url)
    return route.continue_() if _seen[host] else route.abort()


def capture(cfg, site):
    """Takes both previews. An existing image is only replaced by a good new one."""
    if not _public(site["url"]):
        raise ValueError("That address points to a private network, so no preview was taken.")
    from playwright.sync_api import sync_playwright
    with _lock, sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        try:
            for device, opts in DEVICES.items():
                ctx = browser.new_context(
                    viewport=opts["viewport"], is_mobile=opts["mobile"], has_touch=opts["mobile"], device_scale_factor=1,
                    user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
                                if opts["mobile"] else None))
                page = ctx.new_page()
                page.route("**/*", _only_public)   # redirects and page resources must not lead into our network either
                try:
                    resp = page.goto(site["url"], wait_until="domcontentloaded", timeout=45000)
                    if resp is None or resp.status >= 400:
                        raise RuntimeError(f"The site answered with an error ({resp.status if resp else 'no response'}).")
                    try:
                        page.wait_for_load_state("load", timeout=12000)    # heavy sites may never finish: take what is there
                    except Exception:
                        pass
                    page.wait_for_timeout(2000)                            # let fonts, sliders and lazy images settle
                    storage.put(key(site["id"], device), page.screenshot(type="jpeg", quality=72), "image/jpeg", workspace_id=site.get("workspace_id"))
                finally:
                    ctx.close()
        finally:
            browser.close()
    return captured_at(cfg, site["id"])


def remove(cfg, site_id):
    for device in DEVICES:
        storage.remove(key(site_id, device), os.path.join(cfg["data_dir"], "screenshots", f"{site_id}-{device}.jpg"))
