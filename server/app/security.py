"""Password hashing, KDF salt and JWT helpers."""

from __future__ import annotations

import base64
import datetime as dt
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt

from .config import get_settings

settings = get_settings()
_hasher = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=2)
_ALG = "HS256"


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except VerifyMismatchError:
        return False


def generate_kdf_salt() -> str:
    raw = secrets.token_bytes(settings.kdf_salt_bytes)
    return base64.b64encode(raw).decode("ascii")


def issue_token(user_id: str, jti: str) -> tuple[str, dt.datetime]:
    now = dt.datetime.utcnow()
    expires_at = now + dt.timedelta(seconds=settings.token_ttl)
    payload = {"sub": user_id, "jti": jti, "iat": now, "exp": expires_at}
    token = jwt.encode(payload, settings.secret_key, algorithm=_ALG)
    return token, expires_at


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[_ALG])
    except JWTError:
        return None
