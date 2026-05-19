# Архитектура OnyxThorn

## High-level

```
┌─────────────────────────────────────────────────────────────────┐
│                       OnyxThorn (Windows)                       │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐      │
│   │ Gecko (Firefox engine) + наш patch series            │      │
│   │ ─────────────────────────────────────────────────    │      │
│   │  • UA rebrand (C++)            • Pocket strip        │      │
│   │  • DDG default search          • Telemetry off       │      │
│   │  • OnyxThornSync ESM           • Custom welcome      │      │
│   └──────────────────────────────────────────────────────┘      │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐      │
│   │ Chrome UI (HTML/CSS/JS)                              │      │
│   │ ─────────────────────────────────────────────────    │      │
│   │  • chrome://onyxthorn/content/welcome/   (6 шагов)   │      │
│   │  • chrome://onyxthorn/content/home/      (newtab)    │      │
│   │  • chrome://onyxthorn/content/preferences/ (about:preferences) │
│   │  • chrome://onyxthorn/content/download/  (downloads UI) │   │
│   │  • chrome://onyxthorn/content/menu/      (3-точки)   │      │
│   │  • chrome://onyxthorn/skin/userChrome.css            │      │
│   └──────────────────────────────────────────────────────┘      │
│                            │                                    │
│                            │ OnyxThornBridge (privileged JS)    │
│                            ▼                                    │
│   ┌──────────────────────────────────────────────────────┐      │
│   │ services/onyxthorn/                                  │      │
│   │   OnyxThornSync.sys.mjs    (Argon2id + AES-256-GCM)  │      │
│   │   OnyxThornUpdater.sys.mjs                           │      │
│   └─────────────────┬────────────────────────────────────┘      │
└─────────────────────┼───────────────────────────────────────────┘
                      │  HTTPS (JSON)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  sync.<user-domain>.example                     │
│                                                                 │
│   nginx ─► uvicorn ─► FastAPI (app.main:app)                    │
│                                                                 │
│   /auth        /profile      /sync/{name}      /backup          │
│                                                                 │
│   SQLite or Postgres (encrypted blobs only)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Дерево репозитория

```
onyxthorn-browser/
├── branding/                       # Иконки, локали, prefs (копируется в browser/branding/onyxthorn/)
│   ├── icons/
│   ├── locales/{en-US,ru}/
│   ├── pref/
│   │   ├── firefox-branding.js     # default prefs
│   │   ├── onyxthorn.cfg            # locked prefs (autoconfig)
│   │   └── local-settings.js        # autoconfig loader
│   └── configure/configure.sh      # копирует branding в дерево mozilla-unified
├── chrome/                         # Копируется в browser/components/onyxthorn/
│   ├── content/
│   │   ├── welcome/welcome.{html,css,js}
│   │   ├── preferences/preferences.{html,css,js}
│   │   ├── home/home.{html,css,js}
│   │   ├── download/download.{html,css,js}
│   │   ├── menu/panel.{xhtml,css,js}
│   │   └── bridge.js               # privileged JS → window.OnyxThornBridge
│   ├── skin/
│   │   ├── userChrome.css
│   │   └── userContent.css
│   ├── locale/{en-US,ru}/onyxthorn.ftl
│   ├── modules/
│   │   ├── OnyxThornSync.sys.mjs   # копируется в services/onyxthorn/
│   │   └── OnyxThornUpdater.sys.mjs
│   └── jar.mn                      # регистрирует chrome://onyxthorn/
├── patches/                        # Quilt-style патчи к mozilla-unified
│   ├── series
│   ├── 0001-onyxthorn-branding.patch
│   ├── 0002-onyxthorn-default-search-duckduckgo.patch
│   ├── 0003-onyxthorn-disable-telemetry.patch
│   ├── 0004-onyxthorn-register-services-modules.patch
│   ├── 0005-onyxthorn-welcome-and-firstrun.patch
│   ├── 0006-onyxthorn-load-bridge-script.patch
│   ├── 0007-onyxthorn-panelmenu-overlay.patch
│   ├── 0008-onyxthorn-downloads-panel.patch
│   ├── 0009-onyxthorn-user-agent.patch
│   └── 0010-onyxthorn-strip-pocket.patch
├── mozconfig/
│   ├── mozconfig-windows
│   ├── mozconfig-linux
│   └── mozconfig-macos
├── scripts/
│   ├── bootstrap-windows.bat
│   ├── build-windows.bat
│   ├── build-linux.sh
│   └── apply-patches.sh
├── installer/
│   └── nsis/
│       ├── onyxthorn.nsi
│       ├── header.bmp
│       └── wizard.bmp
├── server/                         # FastAPI sync-сервер (отдельно деплоится)
│   ├── app/
│   ├── deploy/install.sh
│   └── pyproject.toml
└── docs/
    ├── BUILD.md
    ├── VPS_SETUP.md
    ├── ARCHITECTURE.md          # эта страница
    └── SYNC_PROTOCOL.md
```

## Лайфцикл запроса (welcome flow)

1. После установки `OnyxThorn-Setup.exe` → запуск `onyxthorn.exe`.
2. Firefox-startup читает `browser/app/defaults/pref/local-settings.js` →
   тот говорит «`general.config.filename=onyxthorn.cfg`».
3. `onyxthorn.cfg` блокирует prefs (telemetry, fxAccount и т.п.).
4. `branding/pref/firefox-branding.js` ставит default prefs (home URL, DDG, accent).
5. `BrowserGlue._onFirstWindowLoaded` патч проверяет
   `onyxthorn.welcome.completed`. Если `false` — открывает
   `chrome://onyxthorn/content/welcome/welcome.html`.
6. На странице загружается `bridge.js` через
   `OnyxThornStartup.observe` — он создаёт `window.OnyxThornBridge` с
   привилегированными методами.
7. Пользователь жмёт кнопки → `welcome.js` зовёт
   `Bridge.setPref/setAccent/setTheme/...`.
8. На последнем шаге → `Bridge.finishWelcome()` + `Bridge.openHome()`.

## Лайфцикл `Sync now`

1. Пользователь жмёт **«Синхронизировать сейчас»** в `about:preferences#sync`.
2. `preferences.js` → `Bridge.syncNow()` → `OnyxThornSync.syncNow()`.
3. Модуль:
   * Делает выборку всех вкл-ключённых коллекций (bookmarks, history, passwords, settings, tabs, addons).
   * Для каждой — `_gather(c)` собирает данные через `PlacesUtils` / `LoginHelper` / т.д.
   * Шифрует ключом, выведенным из пароля.
   * `PUT /sync/{name}` с {iv, ciphertext, meta}.
4. Сервер пишет blob 1-к-1.
5. Модуль сохраняет `onyxthorn.sync.lastrun` → UI обновляется.

## Минимизация поверхности

Что выкошено:

* **Telemetry** (4 разных pipeline'а — все отключены, плюс C++ ранний-return).
* **Mozilla Account / Sync** (`identity.fxaccounts.enabled=false`, `services.sync.enabled=false`).
* **Pocket** (директория не собирается, кнопка скрыта в userChrome.css).
* **Default Browser Agent** (отключено в `mozconfig`).
* **Crash reporter** (отключено в `mozconfig`).
* **Studies/Normandy/Shield** (`app.normandy.*=false`, `app.shield.*=false`).
* **Search suggestions** (по умолчанию off, пользователь может включить).

Что оставлено и важно:

* **HTTPS-Only** (по умолчанию on).
* **Tracking Protection** (Strict).
* **Resist Fingerprinting** (off по умолчанию — ломает много сайтов, доступно в prefs).
* **DoH** (Cloudflare по умолчанию).
* **Sandbox** (включен).
* **Update mechanism** (через наш сервер).
