"""Keeps requests made for customers away from our own network (server-side request forgery).

Customers type in website addresses and webhook URLs, and our servers go and fetch them. Without a guard, an
address such as http://169.254.169.254/ (cloud metadata) or http://postgres.railway.internal:5432 would be
fetched from inside our network and the answer shown back to the customer. Every outbound request for a
customer goes through here: the host is resolved, every address it resolves to must be public, and the check
is repeated for each redirect.
"""
import ipaddress
import socket
from urllib.parse import urlparse

import requests

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


class SafeSession(requests.Session):
    """A Session that checks every request it sends, including each hop of a redirect chain."""

    def send(self, request, **kwargs):
        check_url(request.url)
        return super().send(request, **kwargs)


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


def chat_webhook_ok(url):
    p = urlparse(url or "")
    h = (p.hostname or "").lower()
    return p.scheme == "https" and not p.port and any(h == d or (d.startswith(".") and h.endswith(d)) for d in CHAT_HOSTS)
