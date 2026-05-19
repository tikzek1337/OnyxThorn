"""OnyxThorn sync server entrypoint."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import get_settings
from .database import engine
from .models import Base
from .routers import auth, backup, profile, sync

settings = get_settings()
logger = logging.getLogger("onyxthorn-sync")

app = FastAPI(
    title="OnyxThorn Sync",
    version=__version__,
    description="Self-hosted sync backend for the OnyxThorn browser. All payloads "
                "are encrypted client-side; the server only stores opaque blobs.",
    license_info={"name": "MPL-2.0"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _bootstrap() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict:
    return {"ok": True, "version": __version__}


@app.get("/version", tags=["meta"])
async def version() -> dict:
    return {"name": "OnyxThorn Sync", "version": __version__, "protocol": 1}


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(sync.router)
app.include_router(backup.router)


def run() -> None:
    import uvicorn
    host, port = settings.bind.split(":")
    uvicorn.run("app.main:app", host=host, port=int(port), reload=False)


if __name__ == "__main__":
    run()
