"""Shared FastAPI dependencies."""

from __future__ import annotations

import datetime as dt

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import Token, User
from .security import decode_token


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")

    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "malformed token")

    # Check token row exists & not revoked / expired
    res = await db.execute(select(Token).where(Token.jti == jti))
    row = res.scalar_one_or_none()
    if not row or row.revoked or row.expires_at < dt.datetime.utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token revoked or expired")

    user = await db.get(User, sub)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user gone")
    return user
