"""ORM models."""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Optional

from sqlalchemy import JSON, ForeignKey, LargeBinary, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    nick: Mapped[str] = mapped_column(String(80), default="")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    password_hash: Mapped[str] = mapped_column(String(255))      # argon2id
    kdf_salt: Mapped[str] = mapped_column(String(64))            # base64 salt for client KDF

    created_at: Mapped[dt.datetime] = mapped_column(default=dt.datetime.utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    collections: Mapped[list["Collection"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    backups:     Mapped[list["Backup"]]     = relationship(back_populates="user", cascade="all, delete-orphan")
    tokens:      Mapped[list["Token"]]      = relationship(back_populates="user", cascade="all, delete-orphan")


class Token(Base):
    __tablename__ = "tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_at: Mapped[dt.datetime] = mapped_column(default=dt.datetime.utcnow)
    expires_at: Mapped[dt.datetime]
    revoked: Mapped[bool] = mapped_column(default=False)

    user: Mapped[User] = relationship(back_populates="tokens")


class Collection(Base):
    """Per-user, per-collection latest encrypted payload (e.g. bookmarks, passwords)."""
    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(64), index=True)        # bookmarks / history / ...
    iv: Mapped[str] = mapped_column(String(32))                      # base64 12-byte IV
    ciphertext: Mapped[bytes] = mapped_column(LargeBinary)
    payload_meta: Mapped[dict] = mapped_column(JSON, default=dict)   # client-supplied metadata
    updated_at: Mapped[dt.datetime] = mapped_column(default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="collections")


class Backup(Base):
    """Full profile snapshots (rolling history)."""
    __tablename__ = "backups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    iv: Mapped[str] = mapped_column(String(32))
    ciphertext: Mapped[bytes] = mapped_column(LargeBinary)
    size_bytes: Mapped[int]
    label: Mapped[str] = mapped_column(String(120), default="")      # optional client-supplied label
    created_at: Mapped[dt.datetime] = mapped_column(default=dt.datetime.utcnow, index=True)

    user: Mapped[User] = relationship(back_populates="backups")
