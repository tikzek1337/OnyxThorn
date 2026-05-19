"""Auth endpoints: register / login / logout."""

from __future__ import annotations

import datetime as dt
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..deps import get_current_user
from ..models import Token, User
from ..schemas import AccountOut, LoginIn, RegisterIn, TokenOut
from ..security import (
    generate_kdf_salt,
    hash_password,
    issue_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _account_out(user: User) -> AccountOut:
    return AccountOut(
        id=user.id,
        email=user.email,
        nick=user.nick,
        avatar_url=user.avatar_url,
        kdf_salt=user.kdf_salt,
        created_at=user.created_at,
    )


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")

    user = User(
        email=body.email,
        nick=body.nick or body.email.split("@")[0],
        password_hash=hash_password(body.password),
        kdf_salt=generate_kdf_salt(),
    )
    db.add(user)
    await db.flush()  # need user.id

    jti = secrets.token_hex(16)
    token_str, exp = issue_token(user.id, jti)
    db.add(Token(user_id=user.id, jti=jti, expires_at=exp))
    await db.commit()

    return TokenOut(account=_account_out(user), token=token_str, expires_at=exp, kdf_salt=user.kdf_salt)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    res = await db.execute(select(User).where(User.email == body.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")

    jti = secrets.token_hex(16)
    token_str, exp = issue_token(user.id, jti)
    db.add(Token(user_id=user.id, jti=jti, expires_at=exp))
    await db.commit()

    return TokenOut(account=_account_out(user), token=token_str, expires_at=exp, kdf_salt=user.kdf_salt)


@router.post("/logout", status_code=204)
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Revoke ALL tokens for the user. Simple and forgiving.
    res = await db.execute(select(Token).where(Token.user_id == user.id, Token.revoked.is_(False)))
    for t in res.scalars():
        t.revoked = True
    await db.commit()
