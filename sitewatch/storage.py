"""File storage: Cloudinary when CLOUDINARY_URL (or the three CLOUDINARY_* values) is set, local disk otherwise.

Private files (invoices, screenshots) use Cloudinary's `authenticated` delivery, so a file can only be fetched
through this server after the caller's workspace has been checked. Logos are public images.
Every stored file gets a row in `assets` so the web service and the worker (separate disks) see the same files.
"""
import hashlib
import logging
import os
import time
from urllib.parse import urlparse

import requests

from . import db

log = logging.getLogger("sitewatch.storage")
_local_dir = "data"


def init(cfg):
    global _local_dir
    _local_dir = cfg["data_dir"]


def _creds():
    url = os.environ.get("CLOUDINARY_URL", "")
    if url.startswith("cloudinary://"):
        u = urlparse(url)
        return u.hostname, u.username, u.password
    c, k, s = (os.environ.get(x) for x in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))
    return (c, k, s) if c and k and s else None


def cloud_enabled():
    return _creds() is not None


def _sign(params, secret):
    to_sign = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if v not in (None, ""))
    return hashlib.sha1((to_sign + secret).encode()).hexdigest()


def _local_path(key):
    p = os.path.abspath(os.path.join(_local_dir, "files", key))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def _public_id(key):
    return "sitewatch/" + key


def put(key, data, mime="application/octet-stream", public=False):
    """Store bytes under `key` (like 'invoice/abc.pdf'). Returns a URL for public files, else None."""
    creds = _creds()
    ref, url = "local", None
    if creds:
        cloud, api_key, secret = creds
        params = {"public_id": _public_id(key), "timestamp": int(time.time()), "overwrite": "true", "invalidate": "true",
                  "type": "upload" if public else "authenticated"}
        kind = "image" if public else "raw"
        r = requests.post(f"https://api.cloudinary.com/v1_1/{cloud}/{kind}/upload",
                          data={**params, "api_key": api_key, "signature": _sign(params, secret)},
                          files={"file": (os.path.basename(key), data, mime)}, timeout=60)
        if r.status_code >= 300:
            raise RuntimeError(f"Cloudinary upload failed: {r.text[:200]}")
        res = r.json()
        ref = f"cloudinary:{kind}:{params['type']}"
        url = res.get("secure_url") if public else None
    else:
        with open(_local_path(key), "wb") as f:
            f.write(data)
    db.exec("""INSERT INTO assets(key, ref, mime, size, ts) VALUES (?,?,?,?,?)
               ON CONFLICT (key) DO UPDATE SET ref=EXCLUDED.ref, mime=EXCLUDED.mime, size=EXCLUDED.size, ts=EXCLUDED.ts""",
            (key, ref, mime, len(data), time.time()))
    return url


def info(key):
    return db.q1("SELECT * FROM assets WHERE key=?", (key,))


def get(key, legacy_path=None):
    """The file's bytes, or None. `legacy_path` is where files saved before this module existed live."""
    row = info(key)
    if row and row["ref"].startswith("cloudinary:"):
        _, kind, typ = row["ref"].split(":")
        cloud, api_key, secret = _creds()
        params = {"public_id": _public_id(key), "type": typ, "mode": "download", "timestamp": int(time.time())}
        r = requests.get(f"https://api.cloudinary.com/v1_1/{cloud}/{kind}/download",
                         params={**params, "api_key": api_key, "signature": _sign(params, secret)}, timeout=60)
        return r.content if r.status_code == 200 else None
    for p in (_local_path(key) if row else None, legacy_path):
        if p and os.path.exists(p):
            with open(p, "rb") as f:
                return f.read()
    return None


def remove(key, legacy_path=None):
    row = info(key)
    if row and row["ref"].startswith("cloudinary:"):
        _, kind, typ = row["ref"].split(":")
        cloud, api_key, secret = _creds()
        params = {"public_id": _public_id(key), "type": typ, "timestamp": int(time.time())}
        try:
            requests.post(f"https://api.cloudinary.com/v1_1/{cloud}/{kind}/destroy",
                          data={**params, "api_key": api_key, "signature": _sign(params, secret)}, timeout=30)
        except requests.RequestException as e:
            log.warning("Cloudinary delete failed for %s: %s", key, e)
    for p in (_local_path(key), legacy_path):
        try:
            if p:
                os.remove(p)
        except OSError:
            pass
    db.exec("DELETE FROM assets WHERE key=?", (key,))


def migrate_local(cfg):
    """Copy files saved on the old volume (invoices, screenshots) into the current storage."""
    n = 0
    for sub, kind, mime in (("invoices", "invoice", "application/pdf"), ("screenshots", "shot", "image/jpeg")):
        d = os.path.join(cfg["data_dir"], sub)
        for name in os.listdir(d) if os.path.isdir(d) else []:
            if name.endswith(".tmp"):
                continue
            key = f"{kind}/{name}"
            if not info(key):
                with open(os.path.join(d, name), "rb") as f:
                    put(key, f.read(), mime)
                n += 1
    return n
