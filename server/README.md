# OnyxThorn Sync Server

Self-hosted FastAPI backend for the OnyxThorn browser. Designed to be
deployed on a small VPS (1 vCPU / 1 GB RAM is plenty for a personal
deployment).

## Endpoints

| Method | Path                  | Purpose |
| ------ | --------------------- | ------- |
| POST   | `/auth/register`      | Create a new account. Returns `{account, token, kdf_salt}` |
| POST   | `/auth/login`         | Sign in. Returns `{account, token, kdf_salt}`              |
| POST   | `/auth/logout`        | Invalidate the current token                               |
| GET    | `/profile`            | Fetch the signed-in user's profile                         |
| PATCH  | `/profile`            | Update nick / email / avatar                               |
| POST   | `/profile/password`   | Change password (re-derives sync key — re-encrypt blobs)   |
| GET    | `/sync/{collection}`  | Fetch latest encrypted payload for `collection`            |
| PUT    | `/sync/{collection}`  | Upload latest encrypted payload                            |
| POST   | `/backup`             | Upload a full profile snapshot                             |
| GET    | `/backup/latest`      | Download the latest snapshot                               |
| GET    | `/backup/history`     | List historical snapshots                                  |
| GET    | `/healthz`            | Health check                                               |
| GET    | `/version`            | Server / protocol version                                  |

Authentication is a bearer JWT. Payloads are encrypted client-side — the
server only sees ciphertext. The KDF salt is generated server-side at
registration and pinned to the account.

## Local development

```bash
cd server
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e .[dev]

export ONYXTHORN_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(48))')
uvicorn app.main:app --reload
```

Then visit <http://127.0.0.1:8000/docs> for the interactive Swagger UI.

## VPS deployment

See [`../VPS_SETUP.md`](../VPS_SETUP.md) — there is a one-shot
`deploy/install.sh` script that:

* installs python, sqlite/postgres, nginx and certbot,
* creates a `onyxthorn` system user,
* writes a `systemd` unit, an nginx vhost, an SSL certificate,
* migrates the database and starts the service.

## Storage

By default uses SQLite at `data/onyxthorn-sync.db`. To use Postgres, set:

```bash
export DATABASE_URL="postgresql+asyncpg://onyxthorn:secret@localhost/onyxthorn"
```

## Configuration

All settings via environment variables (or a `.env` file in `server/`):

| Var                       | Default                              | Purpose |
| ------------------------- | ------------------------------------ | ------- |
| `ONYXTHORN_SECRET_KEY`    | — (required)                         | JWT signing secret |
| `DATABASE_URL`            | `sqlite+aiosqlite:///./data/onyxthorn-sync.db` | DSN |
| `ONYXTHORN_BIND`          | `127.0.0.1:8000`                     | uvicorn bind addr |
| `ONYXTHORN_TOKEN_TTL`     | `2592000` (30 days)                  | JWT expiry seconds |
| `ONYXTHORN_MAX_PAYLOAD_MB`| `64`                                 | Per-collection upload cap |
