"""Full-profile backup endpoints."""

from __future__ import annotations

import base64
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Backup, User
from ..schemas import BackupAck, BackupIn, BackupListItem, BackupOut, EncryptedBlob

settings = get_settings()
router = APIRouter(prefix="/backup", tags=["backup"])

_HISTORY_LIMIT = 30


def _fmt_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}" if isinstance(n, float) else f"{n} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


@router.post("", response_model=BackupAck, status_code=201)
async def create_backup(
    body: BackupIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BackupAck:
    try:
        raw = base64.b64decode(body.ciphertext, validate=True)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ciphertext is not valid base64")
    if len(raw) > settings.max_payload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "payload too big")

    b = Backup(user_id=user.id, iv=body.iv, ciphertext=raw, size_bytes=len(raw), label=body.label)
    db.add(b)
    # Trim history.
    res = await db.execute(
        select(Backup).where(Backup.user_id == user.id).order_by(desc(Backup.created_at))
    )
    keep = res.scalars().all()
    for old in keep[_HISTORY_LIMIT:]:
        await db.delete(old)

    await db.commit()
    return BackupAck(ok=True, id=b.id, when=b.created_at, size=_fmt_size(b.size_bytes))


@router.get("/latest", response_model=BackupOut)
async def latest_backup(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BackupOut:
    res = await db.execute(
        select(Backup).where(Backup.user_id == user.id).order_by(desc(Backup.created_at)).limit(1)
    )
    b = res.scalar_one_or_none()
    if not b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no backup yet")
    return BackupOut(
        id=b.id,
        when=b.created_at,
        size_bytes=b.size_bytes,
        label=b.label,
        payload=EncryptedBlob(iv=b.iv, ciphertext=base64.b64encode(b.ciphertext).decode("ascii"), meta={}),
    )


@router.get("/history", response_model=list[BackupListItem])
async def backup_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BackupListItem]:
    res = await db.execute(
        select(Backup).where(Backup.user_id == user.id).order_by(desc(Backup.created_at))
    )
    return [
        BackupListItem(id=b.id, when=b.created_at, size_bytes=b.size_bytes, label=b.label)
        for b in res.scalars()
    ]


@router.get("/{backup_id}", response_model=BackupOut)
async def fetch_backup(
    backup_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BackupOut:
    res = await db.execute(
        select(Backup).where(Backup.user_id == user.id, Backup.id == backup_id)
    )
    b = res.scalar_one_or_none()
    if not b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no such backup")
    return BackupOut(
        id=b.id,
        when=b.created_at,
        size_bytes=b.size_bytes,
        label=b.label,
        payload=EncryptedBlob(iv=b.iv, ciphertext=base64.b64encode(b.ciphertext).decode("ascii"), meta={}),
    )
