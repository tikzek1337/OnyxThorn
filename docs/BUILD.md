# Сборка OnyxThorn на Windows

Инструкция по сборке OnyxThorn из исходников Firefox на чистой Windows 10/11 машине.
Время сборки: ~1.5–3 часа в зависимости от железа (8+ ядер, 16+ ГБ RAM, SSD).
Размер на диске: ~40 ГБ для исходников + объектного дерева + ~600 МБ для готового установщика.

---

## 0. Что нужно

* **Windows 10 1809+ или Windows 11** (Pro / Home — без разницы)
* **8+ ядер CPU**, **16+ ГБ RAM**, **40+ ГБ свободного диска** (SSD сильно ускоряет)
* **Учётная запись с правами администратора** (для установки SDK / NSIS)
* **Хорошее подключение к интернету** (первый bootstrap скачивает ~5 ГБ)

---

## 1. Поставить базу

### 1.1 MozillaBuild (обязательно)

Скачать и установить **в C:\\mozilla-build** (важно, путь без пробелов):

> <https://ftp.mozilla.org/pub/mozilla/libraries/win32/MozillaBuildSetup-Latest.exe>

После установки в этой папке будет `start-shell.bat` — это шелл (Bash + msys), в котором ты будешь работать.

### 1.2 Visual Studio 2022 Community

Запусти инсталлятор VS, в нём поставь компоненты:

* **Workload:** "Desktop development with C++"
* **Individual components:**
  * MSVC v143 - VS 2022 C++ x64/x86 build tools (latest)
  * Windows 10 SDK (10.0.19041.0 или новее)
  * Windows 11 SDK (10.0.22621.0)
  * C++ ATL for v143 build tools (x86 & x64)
  * C++ MFC for v143 build tools (x86 & x64)
  * C++ CMake tools for Windows
  * C++ Clang Compiler for Windows
  * C++ Clang-cl for v143 build tools (x64/x86)

### 1.3 NSIS (для установщика)

Скачать **Unicode NSIS 3.x** (важно: именно Unicode сборка): <https://nsis.sourceforge.io/Download>

После установки добавь `C:\Program Files (x86)\NSIS\Bin\` в `PATH` (можно через "Изменение переменных среды").

### 1.4 Git (опционально, для удобства)

<https://git-scm.com/download/win>

---

## 2. Клонировать репозиторий OnyxThorn

В `start-shell.bat`:

```sh
cd /c/
mkdir onyxthorn && cd onyxthorn
git clone https://github.com/<твой-юзер>/onyxthorn-browser.git
cd onyxthorn-browser
```

Внутри будет:

```
branding/    — иконки, локали, default prefs
chrome/      — welcome / preferences / home / download UI
mozconfig/   — конфиги сборки
patches/     — патчи к Firefox
scripts/     — build-скрипты
installer/   — NSIS-инсталлятор
server/      — FastAPI sync-сервер (на VPS, не для Windows-сборки)
docs/        — эта инструкция
```

---

## 3. Bootstrap (один раз)

```sh
./scripts/bootstrap-windows.bat
```

Этот скрипт сделает:

1. `hg clone https://hg.mozilla.org/mozilla-unified` (Mercurial, ~5 ГБ).
2. Применит OnyxThorn-патчи через `apply-patches.sh`.
3. Скопирует branding-файлы (иконки, локали, default prefs).
4. Запустит `mach bootstrap --application-choice browser --no-interactive` — он сам докачает rustup, cbindgen, clang, NSIS-плагины, и поставит всё что нужно для C++ сборки.
5. Скопирует `mozconfig-windows` → `mozilla-unified/mozconfig`.

После завершения bootstrap у тебя должны:

* существовать `C:\onyxthorn\onyxthorn-browser\mozilla-unified\`
* появиться `~/.mozbuild/` с инструментами

> Если шаг `mach bootstrap` упал — запусти его ещё раз. Иногда он не докачивает что-то с первой попытки из-за сети.

---

## 4. Сборка

```sh
./scripts/build-windows.bat
```

Этот скрипт сделает:

1. `cd mozilla-unified && ./mach build` — собирает Gecko + Firefox + OnyxThorn-расширения. Долго.
2. `./mach package` — упаковывает в `obj-windows/dist/bin/`.
3. Копирует артефакты в `installer/nsis/stage/OnyxThorn/`.
4. Запускает `makensis installer/nsis/onyxthorn.nsi` → получится `installer/nsis/dist/OnyxThorn-Setup-0.1.0.exe`.

### Если что-то падает

* **`mach build` упал на ошибке `clang-cl not found`** → в `mozconfig-windows` нужно явно указать toolchain. Откройте `mozilla-unified/mozconfig` и добавьте:
  ```
  CC="clang-cl"
  CXX="clang-cl"
  ```
* **`error: clang version too old`** → переустанови VS 2022 и поставь свежий "C++ Clang Compiler for Windows".
* **Сборка вылетает с OOM** → закройте всё лишнее, добавьте свопа (`pagefile.sys` хотя бы 32 ГБ), или используйте `mk_add_options MOZ_PARALLEL_BUILD=4` в `mozconfig` чтобы не упереться в RAM.

### Только перепаковать установщик (без полной пересборки)

```sh
cd installer/nsis
makensis onyxthorn.nsi
```

---

## 5. Что получается

* **`installer/nsis/dist/OnyxThorn-Setup-0.1.0.exe`** — финальный установщик.
* **`mozilla-unified/obj-windows/dist/bin/onyxthorn.exe`** — сам бинарник (для запуска без установки).

После установки `OnyxThorn-Setup-0.1.0.exe`:

* установится в `C:\onyxthorn\`,
* создаст ярлык на рабочем столе + в Пуске,
* пропишется в "Программы и компоненты",
* при первом запуске откроется наш welcome-flow.

---

## 6. Подпись (опционально)

Если хочешь подписанный EXE — нужен code-signing сертификат от Sectigo / Digicert / SSL.com (от $90/год). Подпиши финальный exe командой:

```sh
signtool sign /f cert.pfx /p PASSWORD /tr http://timestamp.digicert.com /td sha256 /fd sha256 \
  installer/nsis/dist/OnyxThorn-Setup-0.1.0.exe
```

Без подписи Windows будет показывать SmartScreen-предупреждение при первом запуске — это нормально для не-подписанных билдов.

---

## 7. Обновление до новой версии Firefox

Когда выйдет новый Firefox ESR, обнови `mozilla-unified`:

```sh
cd mozilla-unified
hg pull -u
cd ..
./scripts/apply-patches.sh ./mozilla-unified
cd mozilla-unified && ./mach build && ./mach package
```

Если какой-то из патчей не применится — посмотри в файле `patches/0XYZ-*.patch`, и поправь его под новые координаты строк в Firefox.

---

## 8. Полная очистка

```sh
rm -rf mozilla-unified
rm -rf ~/.mozbuild
```

После этого можно начать с шага 3 заново.
