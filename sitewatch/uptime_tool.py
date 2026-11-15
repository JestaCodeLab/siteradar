"""The free uptime checker on the public website: one look at an address, nothing stored about the site checked."""
import re
import time
from urllib.parse import urlparse

import requests

from . import monitor, netguard, sites

SLOW_MS = 3000
MAX_READ = 200_000          # bytes of the page read, just enough to find the title


def _why(e):
    if isinstance(e, netguard.Blocked):
        return str(e)
    if isinstance(e, requests.exceptions.SSLError):
        return "The security certificate could not be verified. Browsers would show a warning."
    if isinstance(e, requests.exceptions.Timeout):
        return "The website did not answer within 10 seconds."
    if isinstance(e, requests.exceptions.TooManyRedirects):
        return "The website redirects in a loop."
    if isinstance(e, requests.exceptions.ConnectionError):
        return "Could not connect. The address may not exist, or the server is not answering."
    return "The check failed."


def run(raw_url):
    """Open the address once and describe what came back. Raises ValueError for an address that cannot be checked."""
    url = sites.normalise_url(raw_url)
    host = urlparse(url).hostname
    out = {"url": url, "host": host, "up": False, "status_code": None, "response_ms": None, "final_url": None, "redirects": [],
           "title": None, "server": None, "ssl_days_left": None, "ssl_expires": None, "https_redirect": None, "error": None, "verdict": "down",
           "checked_at": time.time()}
    start = time.perf_counter()
    try:
        r = netguard.get(url, timeout=10, headers={"User-Agent": monitor.UA}, allow_redirects=True, stream=True)
        out["response_ms"] = int((time.perf_counter() - start) * 1000)
        out["status_code"] = r.status_code
        out["final_url"] = r.url
        out["redirects"] = [{"status": h.status_code, "url": h.url} for h in r.history][:8]
        out["server"] = (r.headers.get("Server") or "")[:60] or None
        body = b""
        for chunk in r.iter_content(8192):
            body += chunk
            if len(body) >= MAX_READ:
                break
        r.close()
        m = re.search(r"<title[^>]*>(.*?)</title>", body.decode(r.encoding or "utf-8", "ignore"), re.I | re.S)
        if m:
            out["title"] = re.sub(r"\s+", " ", m.group(1)).strip()[:140] or None
        if r.status_code >= 400:
            out["error"] = f"The website answered with an error: HTTP {r.status_code}."
            out["verdict"] = "error"
        else:
            out["up"] = True
            out["verdict"] = "slow" if out["response_ms"] > SLOW_MS else "up"
    except (requests.exceptions.RequestException, netguard.Blocked) as e:
        out["error"] = _why(e)
        out["response_ms"] = out["response_ms"] or int((time.perf_counter() - start) * 1000)
    final = out["final_url"] or url
    try:
        info = monitor.ssl_info(final)
        if info:
            out["ssl_days_left"], out["ssl_expires"] = info
    except Exception:
        pass
    if out["up"]:             # does plain http send visitors to https?
        try:
            h = netguard.head(f"http://{host}/", timeout=6, headers={"User-Agent": monitor.UA}, allow_redirects=False)
            out["https_redirect"] = h.is_redirect and (h.headers.get("Location") or "").lower().startswith("https://")
        except Exception:
            out["https_redirect"] = None
    return out
