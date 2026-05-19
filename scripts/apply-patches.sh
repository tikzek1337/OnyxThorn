#!/usr/bin/env bash
# Apply the OnyxThorn patch series to a fresh mozilla-unified clone.
#
# Usage:
#   scripts/apply-patches.sh /path/to/mozilla-unified
#
# Idempotent: re-running on an already-patched tree is safe (the script
# detects and skips already-applied patches).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOZ="${1:-$PWD}"

if [ ! -f "$MOZ/mach" ]; then
  echo "error: expected mach in $MOZ" >&2
  echo "       pass the path to a mozilla-unified checkout" >&2
  exit 1
fi

cd "$MOZ"

echo ">> Configuring branding"
"$REPO_ROOT/branding/configure/configure.sh" "$MOZ"

echo ">> Installing OnyxThorn services modules"
install -d "$MOZ/services/onyxthorn"
cp "$REPO_ROOT/chrome/modules/OnyxThornSync.sys.mjs"    "$MOZ/services/onyxthorn/OnyxThornSync.sys.mjs"
cp "$REPO_ROOT/chrome/modules/OnyxThornUpdater.sys.mjs" "$MOZ/services/onyxthorn/OnyxThornUpdater.sys.mjs"

echo ">> Installing OnyxThorn chrome resources"
install -d "$MOZ/browser/components/onyxthorn"
cp -r "$REPO_ROOT/chrome/." "$MOZ/browser/components/onyxthorn/"

echo ">> Installing onyxthorn.cfg autoconfig"
install -d "$MOZ/browser/app/defaults/pref"
cp "$REPO_ROOT/branding/pref/local-settings.js" "$MOZ/browser/app/defaults/pref/local-settings.js"
install -d "$MOZ/browser/app"
cp "$REPO_ROOT/branding/pref/onyxthorn.cfg" "$MOZ/browser/app/onyxthorn.cfg"

echo ">> Applying patch series"
mkdir -p .onyxthorn
touch .onyxthorn/applied
for p in "$REPO_ROOT"/patches/*.patch; do
  name=$(basename "$p")
  if grep -qx "$name" .onyxthorn/applied; then
    echo "   skip (already applied): $name"
    continue
  fi
  echo "   apply: $name"
  if ! patch -p1 -N --dry-run < "$p" >/dev/null 2>&1; then
    echo "   warn:  patch $name failed dry-run; attempting forced apply"
  fi
  patch -p1 -N < "$p"
  echo "$name" >> .onyxthorn/applied
done

echo
echo "OK — patches applied. Next:"
echo "  cp $REPO_ROOT/mozconfig/mozconfig-windows mozconfig    # on Windows"
echo "  ./mach build"
echo "  ./mach package"
