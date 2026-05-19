"""Profile endpoints: read / patch / change password."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..models import Collection, User
from ..schemas import (
    AccountOut,
    PasswordChangeIn,
    ProfileOut,
    ProfilePatch,
)
from ..security import generate_kdf_salt, hash_password, verify_password
import base64

router = APIRouter(prefix="/profile", tags=["profile"])


def _account_out(user: User) -> AccountOut:
    return AccountOut(
        id=user.id,
        email=user.email,
        nick=user.nick,
        avatar_url=user.avatar_url,
        kdf_salt=user.kdf_salt,
        created_at=user.created_at,
    )


@router.get("", response_model=ProfileOut)
async def get_profile(user: User = Depends(get_current_user)) -> ProfileOut:
    return ProfileOut(account=_account_out(user))


@router.patch("", response_model=ProfileOut)
async def patch_profile(
    patch: ProfilePatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    if patch.nick is not None:
        user.nick = patch.nick
    if patch.email is not None:
        user.email = patch.email
    if patch.avatar_url is not None:
        user.avatar_url = patch.avatar_url
    db.add(user)
    await db.commit()
    return ProfileOut(account=_account_out(user))


@router.post("/password", response_model=ProfileOut)
async def change_password(
    body: PasswordChangeIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong current password")
    user.password_hash = hash_password(body.new_password)
    user.kdf_salt = body.new_kdf_salt or generate_kdf_salt()

    # Replace all stored blobs with the re-encrypted versions the client uploaded.
    for name, blob in body.reencrypted_blobs.items():
        # Look up existing
        for c in user.collections:
            if c.name == name:
                c.iv = blob["iv"]
                c.ciphertext = base64.b64decode(blob["ciphertext"])
                break
        else:
            user.collections.append(
                Collection(name=name, iv=blob["iv"], ciphertext=base64.b64decode(blob["ciphertext"]))
            )

    db.add(user)
    await db.commit()
    return ProfileOut(account=_account_out(user))
