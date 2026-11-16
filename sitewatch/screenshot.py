"""Homepage preview images (desktop and phone), captured with the same headless Chrome that makes the PDFs."""
import ipaddress
import logging
import os
import socket
import threading
import time
from urllib.parse import urlparse

from . import netguard, storage

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


MAX_BODY = 25 * 1024 * 1024
_DROP = {"content-encoding", "content-length", "transfer-encoding", "connection"}


def _guarded(route):
    """Every request the page makes is sent by us, through netguard, instead of by the browser. The address is checked and
    connected to in one step, so a host that changes its DNS answer between a check and a connection cannot reach our network.
    Redirects come back to the browser, which asks for the next address through here again."""
    req = route.request
    if req.url.startswith(("data:", "blob:", "about:")):
        return route.continue_()
    if not req.url.startswith(("http://", "https://")):
        return route.abort()
    try:
        headers = {k: v for k, v in req.headers.items() if k.lower() not in ("host", "content-length", "cookie")}
        r = netguard.request(req.method, req.url, headers=headers, data=req.post_data_buffer, allow_redirects=False, stream=True, timeout=20)
        body = r.raw.read(MAX_BODY + 1, decode_content=True)
        r.close()
        if len(body) > MAX_BODY:
            return route.abort()
        return route.fulfill(status=r.status_code, headers={k: v for k, v in r.headers.items() if k.lower() not in _DROP}, body=body)
    except Exception:
        return route.abort()


def capture(cfg, site):
    """Takes both previews. An existing image is only replaced by a good new one."""
    if not _public(site["url"]):
        raise ValueError("That address points to a private network, so no preview was taken.")
    from playwright.sync_api import sync_playwright
    with _lock, sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])   # the container runs as an unprivileged user, see the Dockerfile
        try:
            for device, opts in DEVICES.items():
                ctx = browser.new_context(
                    viewport=opts["viewport"], is_mobile=opts["mobile"], has_touch=opts["mobile"], device_scale_factor=1, service_workers="block",
                    user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
                                if opts["mobile"] else None))
                page = ctx.new_page()
                page.route("**/*", _guarded)   # redirects and page resources must not lead into our network either
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
