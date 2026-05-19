# OnyxThorn Browser

> Anonymity. Minimalism. Convenience.

OnyxThorn is a hard fork of Mozilla Firefox built around three principles:

1. **Anonymity by default** — DuckDuckGo as default search engine, telemetry
   disabled, fingerprint resistance on, no Pocket / Sponsored / Mozilla
   Accounts integration, optional Tor-style first-party isolation.
2. **Minimalism** — clean Chrome UI driven by `userChrome.css`, an opinionated
   3-dot panel menu, no Pocket button, no "Highlights", no "Activity Stream"
   noise.
3. **Convenience** — beautiful onboarding, opt-in OnyxThorn Sync to **your own
   VPS** (not Mozilla servers), download UI with speed/ETA, RU/EN languages,
   custom accent colour, horizontal **or** vertical tabs.

This repository contains:

| Folder | Purpose |
| ------ | ------- |
| `branding/` | Icons, locale-aware brand strings, default prefs that override Firefox defaults |
| `patches/` | A quilt-style patch series applied to `mozilla-unified` (HG)  |
| `chrome/` | userChrome.css, welcome flow, custom `about:preferences` pages, panel menu overlay, download UI |
| `mozconfig/` | Build configurations for Windows / Linux / macOS |
| `installer/nsis/` | Windows NSIS installer script + assets |
| `server/` | FastAPI sync server that you deploy on your VPS |
| `scripts/` | Helpers (`apply-patches.sh`, `build-windows.bat`, …) |
| `docs/` | Architecture, patch index, sync protocol |

## Quick start

### Building the browser (Windows)

See [docs/BUILD.md](docs/BUILD.md). TL;DR:

```bat
:: One-time setup
git clone https://github.com/your-fork/onyxthorn-browser.git
cd onyxthorn-browser
scripts\bootstrap-windows.bat

:: Build
scripts\build-windows.bat
```

The build produces `dist\OnyxThorn-Setup-<version>.exe`.

### Setting up the sync server (your VPS)

See [docs/VPS_SETUP.md](docs/VPS_SETUP.md). TL;DR (Ubuntu 22.04 / Debian 12):

```bash
git clone https://github.com/your-fork/onyxthorn-browser.git
cd onyxthorn-browser/server
sudo bash deploy/install.sh sync.example.com you@example.com
```

The installer creates a `systemd` service, an nginx vhost, a Let's Encrypt
certificate, and a `sqlite` database (or Postgres if `DATABASE_URL` is set).

## Architecture at a glance

```
                          ┌─────────────────────────┐
                          │  OnyxThorn (your build) │
                          └───────────┬─────────────┘
                                      │ HTTPS (auth, sync)
                                      │
                          ┌───────────▼─────────────┐
                          │  sync.your-vps.example  │
                          │  FastAPI + sqlite/Pg    │
                          └─────────────────────────┘
```

* Profile data (settings, bookmarks, history, passwords, backup) lives on
  your machine in the standard Firefox profile directory.
* **Nothing leaves the browser until you press "Sync now".**
* Passwords are end-to-end encrypted with a key derived from your master
  password (Argon2id → AES-256-GCM). The server only sees ciphertext.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/SYNC_PROTOCOL.md](docs/SYNC_PROTOCOL.md) for details.

## Status

OnyxThorn is in **alpha**. The chrome, welcome flow and sync server are
complete and end-to-end testable; the C++ patch series is incremental — start
with the included `0001-onyxthorn-branding.patch` and add more from the
`patches/` directory as needed. The full patch series is applied automatically
by `scripts/apply-patches.sh`.

## License

OnyxThorn re-uses the Firefox source tree under MPL-2.0. All OnyxThorn
patches, branding, chrome, installer, server and documentation are also
licensed under MPL-2.0. See [LICENSE](LICENSE).
