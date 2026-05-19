@echo off
:: Build OnyxThorn for Windows. Produces obj-windows\dist\install\sea\*.exe and
:: an unpacked dist directory. Then runs NSIS to build the OnyxThorn installer.

setlocal
set REPO_ROOT=%~dp0..
set MOZ=%REPO_ROOT%\mozilla-unified

if not exist "%MOZ%\mach" (
  echo error: no mozilla-unified at %MOZ%. Run scripts\bootstrap-windows.bat first.
  exit /b 1
)

copy /Y "%REPO_ROOT%\mozconfig\mozconfig-windows" "%MOZ%\mozconfig"

pushd "%MOZ%"
call mach build
if errorlevel 1 ( popd & exit /b 1 )
call mach package
if errorlevel 1 ( popd & exit /b 1 )
popd

:: Stage build artifacts for the NSIS installer.
set STAGE=%REPO_ROOT%\installer\nsis\stage
rmdir /S /Q "%STAGE%" 2>nul
mkdir "%STAGE%"
xcopy /E /I /Y "%MOZ%\obj-windows\dist\bin\*" "%STAGE%\OnyxThorn\"
copy /Y "%REPO_ROOT%\branding\icons\onyxthorn.ico" "%STAGE%\"

:: Build NSIS installer.
where makensis >nul 2>&1
if errorlevel 1 (
  echo NSIS makensis not found in PATH. Install from https://nsis.sourceforge.io/Download
  echo and re-run. Skipping installer step.
  exit /b 0
)

makensis "%REPO_ROOT%\installer\nsis\onyxthorn.nsi"
if errorlevel 1 exit /b 1

echo.
echo OK. Installer at: %REPO_ROOT%\installer\nsis\dist\OnyxThorn-Setup.exe
endlocal
