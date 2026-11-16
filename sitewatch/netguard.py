"""Keeps requests made for customers away from our own network (server-side request forgery).

Customers type in website addresses and webhook URLs, and our servers go and fetch them. Without a guard, an
address such as http://169.254.169.254/ (cloud metadata) or http://postgres.railway.internal:5432 would be
fetched from inside our network and the answer shown back to the customer. Every outbound request for a
customer goes through here: the host is resolved, every address it resolves to must be public, and the check
is repeated for each redirect.
"""
import ipaddress
import socket
import threading
import time
from urllib.parse import urlparse

import requests
import urllib3.util.connection
from requests.adapters import HTTPAdapter

PORTS = {80, 443, 8080, 8443}


class Blocked(requests.exceptions.ConnectionError):
    """Raised for an address we refuse to contact. A ConnectionError, so callers report it like any unreachable site."""


def _public_ips(host, port):
    """The addresses `host` resolves to, if every one of them is public. Raises Blocked otherwise."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise requests.exceptions.ConnectionError(f"Could not find {host}: {e}") from None
    ips = []
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        if not ip.is_global:                  # private, loopback, link-local, carrier-grade NAT, reserved, multicast
            raise Blocked("That address points to a private network, so it was not contacted.")
        ips.append(str(ip))
    if not ips:
        raise Blocked("That address did not resolve.")
    return ips


def check_url(url):
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise Blocked("Only http and https addresses can be checked.")
    port = p.port or (443 if p.scheme == "https" else 80)
    if port not in PORTS:
        raise Blocked(f"Port {port} is not allowed. Use 80, 443, 8080 or 8443.")
    _public_ips(p.hostname, port)


def is_public_url(url):
    """True when the address is fine to contact, or cannot be resolved yet (a down site is still a site to monitor)."""
    try:
        check_url(url)
    except Blocked:
        return False
    except requests.exceptions.RequestException:
        return True
    return True


_local = threading.local()
_original_create_connection = urllib3.util.connection.create_connection


def _guarded_create_connection(address, *args, **kwargs):
    """While a SafeSession request is being sent, connect to an address that was checked at this moment, not to whatever a second
    lookup returns. This closes the gap a DNS rebinding attack uses (public answer for the check, private answer for the connection).
    TLS still verifies the certificate against the real host name, because only the socket address changes."""
    if not getattr(_local, "depth", 0):
        return _original_create_connection(address, *args, **kwargs)
    host, port = address
    last = None
    for ip in _public_ips(host.strip("[]"), port):
        try:
            return _original_create_connection((ip, port), *args, **kwargs)
        except OSError as e:
            last = e
    raise last or Blocked("That address did not resolve.")


urllib3.util.connection.create_connection = _guarded_create_connection


MAX_BODY = 8 * 1024 * 1024        # the most we read of any one response
MAX_READ_SECONDS = 60             # and the longest we spend reading it, so a slow trickle cannot hold a worker


class _Capped:
    """Stands in for a response's body stream and ends it after MAX_BODY bytes or MAX_READ_SECONDS, so one hostile website cannot
    use up the memory or the threads that monitor everyone else's. What was read is kept; the rest is simply not read."""

    def __init__(self, raw):
        self._raw, self._left, self._until = raw, MAX_BODY, time.monotonic() + MAX_READ_SECONDS

    def __getattr__(self, name):
        return getattr(self._raw, name)

    def read(self, amt=None, *args, **kwargs):
        if self._left <= 0 or time.monotonic() > self._until:
            return b""
        data = self._raw.read(self._left if amt is None else min(amt, self._left), *args, **kwargs)
        self._left -= len(data)
        return data

    def stream(self, amt=2 ** 16, *args, **kwargs):
        while True:
            chunk = self.read(amt, *args, **kwargs)
            if not chunk:
                return
            yield chunk


class _CappedAdapter(HTTPAdapter):
    def build_response(self, req, resp):
        r = super().build_response(req, resp)
        r.raw = _Capped(r.raw)
        return r


class SafeSession(requests.Session):
    """A Session that checks every request it sends, including each hop of a redirect chain, and connects only to the checked address."""

    def __init__(self):
        super().__init__()
        for scheme in ("http://", "https://"):
            self.mount(scheme, _CappedAdapter())

    def send(self, request, **kwargs):
        check_url(request.url)
        _local.depth = getattr(_local, "depth", 0) + 1
        try:
            return super().send(request, **kwargs)
        finally:
            _local.depth -= 1


def request(method, url, **kwargs):
    with SafeSession() as s:
        return s.request(method, url, **kwargs)


def get(url, **kwargs):
    return request("GET", url, **kwargs)


def head(url, **kwargs):
    return request("HEAD", url, **kwargs)


def post(url, **kwargs):
    return request("POST", url, **kwargs)


def connect_tls(host, port, timeout=10):
    """A plain socket to a verified public address of `host` (the one we checked, not a second lookup)."""
    if port not in PORTS:
        raise Blocked(f"Port {port} is not allowed.")
    return socket.create_connection((_public_ips(host, port)[0], port), timeout=timeout)


# Where alert messages may be posted. A webhook anywhere else would let a customer aim our servers at any site.
CHAT_HOSTS = ("hooks.slack.com", ".webhook.office.com", ".office.com", ".logic.azure.com", ".api.powerplatform.com", ".powerplatform.com")


# Where browser push messages may be sent: the push services the major browsers use. An endpoint anywhere else would let a
# customer aim our servers at any address.
PUSH_HOSTS = ("fcm.googleapis.com", "android.googleapis.com", ".push.services.mozilla.com", ".push.apple.com", ".notify.windows.com")


def push_endpoint_ok(url):
    p = urlparse(url or "")
    h = (p.hostname or "").lower()
    return p.scheme == "https" and not p.port and not p.username and any(h == d or (d.startswith(".") and h.endswith(d)) for d in PUSH_HOSTS)


def chat_webhook_ok(url):
    p = urlparse(url or "")
    h = (p.hostname or "").lower()
    return p.scheme == "https" and not p.port and any(h == d or (d.startswith(".") and h.endswith(d)) for d in CHAT_HOSTS)
