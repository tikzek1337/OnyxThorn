@echo off
:: One-time bootstrap for OnyxThorn on Windows.
:: Run from a `mozilla-build` shell (start-shell.bat).

setlocal
set REPO_ROOT=%~dp0..
set MOZ=%REPO_ROOT%\mozilla-unified

if not exist "%MOZ%" (
  echo Cloning mozilla-unified into %MOZ%
  hg clone https://hg.mozilla.org/mozilla-unified "%MOZ%"
) else (
  echo Updating mozilla-unified
  pushd "%MOZ%" && hg pull -u && popd
)

bash "%REPO_ROOT%\scripts\apply-patches.sh" "%MOZ%"

copy /Y "%REPO_ROOT%\mozconfig\mozconfig-windows" "%MOZ%\mozconfig"

pushd "%MOZ%"
echo Running mach bootstrap...
call mach bootstrap --application-choice browser --no-interactive
popd

echo.
echo Done. Now run scripts\build-windows.bat to build the installer.
endlocal
