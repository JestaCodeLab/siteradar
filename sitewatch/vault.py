"""Encrypts secrets kept in the database, such as a customer's Google refresh token, so a copy of the database alone cannot use them.

The key comes from TOKEN_KEY (any long random text). Without it the login SECRET_KEY is used, so set TOKEN_KEY to keep the two apart."""
import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken


def _fernet():
    seed = os.environ.get("TOKEN_KEY") or os.environ.get("SECRET_KEY")
    if not seed:
        raise RuntimeError("TOKEN_KEY is not set, so secrets cannot be stored safely.")
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(seed.encode()).digest()))


def seal(text):
    return _fernet().encrypt(text.encode()).decode()


def unseal(token):
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None          # the key changed, so the owner has to connect again
