"""Sync endpoints: per-collection encrypted blobs."""

from __future__ import annotations

import base64
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Collection, User
from ..schemas import CollectionOut, EncryptedBlob, SyncAck

settings = get_settings()
router = APIRouter(prefix="/sync", tags=["sync"])

ALLOWED = {"bookmarks", "history", "passwords", "settings", "tabs", "addons"}


def _check(name: str) -> None:
    if name not in ALLOWED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"unknown collection {name!r}")


@router.get("/{name}", response_model=CollectionOut)
async def get_collection(
    name: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollectionOut:
    _check(name)
    res = await db.execute(select(Collection).where(Collection.user_id == user.id, Collection.name == name))
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no payload yet")
    return CollectionOut(
        name=c.name,
        iv=c.iv,
        ciphertext=base64.b64encode(c.ciphertext).decode("ascii"),
        meta=c.payload_meta,
        updated_at=c.updated_at,
    )


@router.put("/{name}", response_model=SyncAck)
async def put_collection(
    name: str,
    body: EncryptedBlob,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SyncAck:
    _check(name)
    try:
        raw = base64.b64decode(body.ciphertext, validate=True)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ciphertext is not valid base64")

    if len(raw) > settings.max_payload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "payload too big")

    res = await db.execute(select(Collection).where(Collection.user_id == user.id, Collection.name == name))
    c = res.scalar_one_or_none()
    if c is None:
        c = Collection(user_id=user.id, name=name, iv=body.iv, ciphertext=raw, payload_meta=body.meta)
        db.add(c)
    else:
        c.iv = body.iv
        c.ciphertext = raw
        c.payload_meta = body.meta

    await db.commit()
    return SyncAck(ok=True, when=dt.datetime.utcnow(), name=name, size_bytes=len(raw))
