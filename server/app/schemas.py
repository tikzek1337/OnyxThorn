"""Pydantic v2 schemas for request / response bodies."""

from __future__ import annotations

import datetime as dt
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, constr


# ---------------------------- Auth ----------------------------

class RegisterIn(BaseModel):
    email: EmailStr
    password: constr(min_length=8, max_length=256)
    nick: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AccountOut(BaseModel):
    id: str
    email: EmailStr
    nick: str
    avatar_url: Optional[str] = None
    kdf_salt: str
    created_at: dt.datetime


class TokenOut(BaseModel):
    account: AccountOut
    token: str
    expires_at: dt.datetime
    kdf_salt: str


# ---------------------------- Profile ----------------------------

class ProfilePatch(BaseModel):
    nick: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None


class ProfileOut(BaseModel):
    account: AccountOut


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: constr(min_length=8, max_length=256)
    new_kdf_salt: str
    reencrypted_blobs: dict[str, dict[str, Any]] = Field(default_factory=dict)
    """Map of collection_name -> {iv, ciphertext} re-encrypted with the new key."""


# ---------------------------- Sync ----------------------------

class EncryptedBlob(BaseModel):
    iv: constr(min_length=8, max_length=32)
    ciphertext: str   # base64
    meta: dict[str, Any] = Field(default_factory=dict)


class CollectionOut(BaseModel):
    name: str
    iv: str
    ciphertext: str
    meta: dict[str, Any]
    updated_at: dt.datetime


class SyncAck(BaseModel):
    ok: bool
    when: dt.datetime
    name: str
    size_bytes: int


# ---------------------------- Backup ----------------------------

class BackupIn(BaseModel):
    iv: str
    ciphertext: str
    label: str = ""


class BackupAck(BaseModel):
    ok: bool
    id: str
    when: dt.datetime
    size: str


class BackupOut(BaseModel):
    id: str
    when: dt.datetime
    size_bytes: int
    label: str
    payload: EncryptedBlob


class BackupListItem(BaseModel):
    id: str
    when: dt.datetime
    size_bytes: int
    label: str
