; OnyxThorn NSIS installer (Modern UI 2).
; Build with: makensis installer/nsis/onyxthorn.nsi
;
; Expects build artifacts in ../stage/OnyxThorn/ and the icon at ../stage/onyxthorn.ico
; (scripts/build-windows.bat puts everything in place).

!include "MUI2.nsh"
!include "FileFunc.nsh"

;-------------------- Product info --------------------
!define PRODUCT_NAME      "OnyxThorn"
!define PRODUCT_VERSION   "0.1.0"
!define PRODUCT_PUBLISHER "OnyxThorn"
!define PRODUCT_WEB_SITE  "https://onyxthorn.example"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\onyxthorn.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name             "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile          "dist\OnyxThorn-Setup-${PRODUCT_VERSION}.exe"
InstallDir       "C:\onyxthorn"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
RequestExecutionLevel admin
ShowInstDetails   show
ShowUninstDetails show
SetCompressor /SOLID /FINAL lzma

;-------------------- UI --------------------
!define MUI_ABORTWARNING
!define MUI_ICON   "..\stage\onyxthorn.ico"
!define MUI_UNICON "..\stage\onyxthorn.ico"

; Custom colors / theming
!define MUI_BGCOLOR FAFAFA
!define MUI_TEXTCOLOR 111827
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "header.bmp"    ; optional — fallback to default if missing
!define MUI_WELCOMEFINISHPAGE_BITMAP "wizard.bmp"

!define MUI_WELCOMEPAGE_TITLE "Установка OnyxThorn"
!define MUI_WELCOMEPAGE_TEXT  "Чистый и минималистичный браузер.$\r$\n$\r$\nЭтот мастер установит OnyxThorn ${PRODUCT_VERSION} на ваш компьютер.$\r$\n$\r$\nПо умолчанию устанавливается в C:\onyxthorn — папка с загрузками будет C:\onyxthorn\downloads.$\r$\n$\r$\nНажмите «Далее», чтобы продолжить."

!define MUI_LICENSEPAGE_TEXT_TOP "Лицензионное соглашение MPL-2.0 (Mozilla Public License v2)."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "Если вы принимаете условия соглашения, нажмите «Я принимаю».$\r$\nНажмите «Далее» чтобы продолжить."
!define MUI_DIRECTORYPAGE_TEXT_TOP "Программа будет установлена в указанную папку. Чтобы выбрать другую, нажмите «Обзор»."

!define MUI_FINISHPAGE_RUN              "$INSTDIR\onyxthorn.exe"
!define MUI_FINISHPAGE_RUN_TEXT         "Запустить OnyxThorn"
!define MUI_FINISHPAGE_SHOWREADME       "$INSTDIR\WELCOME.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT  "Открыть инструкцию"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "Russian"
!insertmacro MUI_LANGUAGE "English"

;-------------------- Sections --------------------
Section "OnyxThorn (обязательно)" SecCore
  SectionIn RO
  SetOutPath "$INSTDIR"
  File /r "..\stage\OnyxThorn\*.*"
  File    "..\stage\onyxthorn.ico"

  ; Mark base dirs the user requested.
  CreateDirectory "$INSTDIR\downloads"
  CreateDirectory "$INSTDIR\profile"

  ; License / readme
  File "..\..\LICENSE"
  FileOpen $0 "$INSTDIR\WELCOME.txt" w
  FileWrite $0 "OnyxThorn ${PRODUCT_VERSION} установлен в $INSTDIR$\r$\n$\r$\n"
  FileWrite $0 "Загрузки будут сохраняться в $INSTDIR\downloads$\r$\n"
  FileWrite $0 "Профиль: $INSTDIR\profile$\r$\n$\r$\n"
  FileWrite $0 "Сайт: ${PRODUCT_WEB_SITE}$\r$\n"
  FileClose $0

  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}"  ""             "$INSTDIR\onyxthorn.exe"
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}"  "Path"         "$INSTDIR"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName"   "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher"     "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout"  "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon"   "$INSTDIR\onyxthorn.ico"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"

  WriteUninstaller "$INSTDIR\uninst.exe"
SectionEnd

Section "Ярлык на рабочем столе" SecDesktop
  CreateShortCut "$DESKTOP\OnyxThorn.lnk" "$INSTDIR\onyxthorn.exe" "" "$INSTDIR\onyxthorn.ico" 0
SectionEnd

Section "Ярлык в меню Пуск" SecStartMenu
  CreateDirectory "$SMPROGRAMS\OnyxThorn"
  CreateShortCut "$SMPROGRAMS\OnyxThorn\OnyxThorn.lnk"       "$INSTDIR\onyxthorn.exe" "" "$INSTDIR\onyxthorn.ico" 0
  CreateShortCut "$SMPROGRAMS\OnyxThorn\Удалить OnyxThorn.lnk" "$INSTDIR\uninst.exe"
SectionEnd

Section "Закрепить в панели задач" SecTaskbar
  ; Note: Windows blocks programmatic taskbar pinning since 10. We create
  ; a Start Menu shortcut, which users can right-click → Pin to taskbar.
  ; Use the same shortcut as SecStartMenu.
SectionEnd

Section "Сделать OnyxThorn браузером по умолчанию" SecDefaultBrowser
  ExecWait '"$INSTDIR\onyxthorn.exe" --set-default-browser'
SectionEnd

;-------------------- Component descriptions --------------------
LangString DESC_SecCore        ${LANG_RUSSIAN} "Основные файлы OnyxThorn (обязательно)."
LangString DESC_SecDesktop     ${LANG_RUSSIAN} "Ярлык на рабочем столе."
LangString DESC_SecStartMenu   ${LANG_RUSSIAN} "Папка с ярлыками в меню Пуск."
LangString DESC_SecTaskbar     ${LANG_RUSSIAN} "Подсказать Windows закрепить в панели задач."
LangString DESC_SecDefaultBrowser ${LANG_RUSSIAN} "Установить OnyxThorn браузером по умолчанию."

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecCore}            $(DESC_SecCore)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop}         $(DESC_SecDesktop)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu}       $(DESC_SecStartMenu)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecTaskbar}         $(DESC_SecTaskbar)
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDefaultBrowser}  $(DESC_SecDefaultBrowser)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

;-------------------- Uninstaller --------------------
Section "Uninstall"
  Delete "$DESKTOP\OnyxThorn.lnk"
  Delete "$SMPROGRAMS\OnyxThorn\OnyxThorn.lnk"
  Delete "$SMPROGRAMS\OnyxThorn\Удалить OnyxThorn.lnk"
  RMDir  "$SMPROGRAMS\OnyxThorn"

  RMDir /r "$INSTDIR\downloads"
  RMDir /r "$INSTDIR\profile"
  RMDir /r "$INSTDIR\browser"
  RMDir /r "$INSTDIR\defaults"
  RMDir /r "$INSTDIR\dictionaries"
  RMDir /r "$INSTDIR\fonts"
  RMDir /r "$INSTDIR\gmp-clearkey"
  Delete   "$INSTDIR\*.*"
  RMDir    "$INSTDIR"

  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd
