"""Time-based one-time codes (RFC 6238) for the super admin sign-in: the six digits an authenticator app (Google Authenticator, 1Password,
Authy) shows and changes every 30 seconds. Needs no extra library.

Two-factor sign-in is required for super admins when the platform runs on https, or whenever SUPER_2FA=on. SUPER_2FA=off switches it off
(local development only)."""
import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
from urllib.parse import quote

STEP = 30
DIGITS = 6


def required():
    flag = os.environ.get("SUPER_2FA", "").lower()
    return flag == "on" or (flag != "off" and os.environ.get("APP_URL", "").startswith("https://"))


def new_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def uri(secret, email):
    return f"otpauth://totp/SiteRadar:{quote(email)}?secret={secret}&issuer=SiteRadar&digits={DIGITS}&period={STEP}"


def _code(secret, counter):
    key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
    mac = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    o = mac[-1] & 15
    return f"{(struct.unpack('>I', mac[o:o + 4])[0] & 0x7FFFFFFF) % 10 ** DIGITS:0{DIGITS}d}"


def verify(secret, code, last_step=0, now=None):
    """The time step of a right code, or None. One step either side of now is accepted (clock drift), and a step that was already used
    (`last_step` or older) is refused, so a code seen over someone's shoulder cannot be used again."""
    code = "".join(c for c in str(code or "") if c.isdigit())
    if len(code) != DIGITS:
        return None
    now_step = int((now if now is not None else time.time()) // STEP)
    for step in (now_step, now_step - 1, now_step + 1):
        if step > last_step and hmac.compare_digest(_code(secret, step), code):
            return step
    return None
