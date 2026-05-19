"""Runtime configuration for the OnyxThorn sync server."""

from __future__ import annotations

import secrets
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ONYXTHORN_", env_file=".env", extra="ignore")

    secret_key: str = Field(default_factory=lambda: secrets.token_hex(48), description="JWT signing secret")
    database_url: str = Field(
        default="sqlite+aiosqlite:///./data/onyxthorn-sync.db",
        alias="DATABASE_URL",
    )
    token_ttl: int = 60 * 60 * 24 * 30  # 30 days
    max_payload_mb: int = 64
    bind: str = "127.0.0.1:8000"
    public_url: str = "http://127.0.0.1:8000"
    allow_origins: list[str] = Field(default_factory=lambda: ["*"])

    # KDF for client-side encryption (we just store the salt the client uses)
    kdf_salt_bytes: int = 16

    @property
    def db_async(self) -> str:
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
