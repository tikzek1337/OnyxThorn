#!/usr/bin/env bash
# OnyxThorn branding configure helper.
# Run this from the root of a fresh `mozilla-unified` clone after applying
# patches with scripts/apply-patches.sh. It copies branding assets into
# browser/branding/onyxthorn/ so that the build picks them up.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOZ_ROOT="${1:-$PWD}"

if [ ! -f "$MOZ_ROOT/mach" ]; then
  echo "error: expected mach in $MOZ_ROOT — pass the path to mozilla-unified"
  exit 1
fi

BRAND_DIR="$MOZ_ROOT/browser/branding/onyxthorn"
mkdir -p "$BRAND_DIR" "$BRAND_DIR/content" "$BRAND_DIR/locales/en-US" "$BRAND_DIR/locales/ru"

cp "$REPO_ROOT/branding/icons/onyxthorn.ico" "$BRAND_DIR/firefox.ico"
cp "$REPO_ROOT/branding/icons/onyxthorn.ico" "$BRAND_DIR/document.ico"
cp "$REPO_ROOT/branding/icons/onyxthorn.ico" "$BRAND_DIR/branch.ico"

for s in 16 22 24 32 48 64 128 256; do
  cp "$REPO_ROOT/branding/icons/default${s}.png" "$BRAND_DIR/default${s}.png" 2>/dev/null || true
done

cp "$REPO_ROOT/branding/icons/default512.png" "$BRAND_DIR/content/about-logo.png"
cp "$REPO_ROOT/branding/icons/default192.png" "$BRAND_DIR/content/about-logo@2x.png"
cp "$REPO_ROOT/branding/icons/default512.png" "$BRAND_DIR/content/onyxthorn-wordmark.png"

cp "$REPO_ROOT/branding/locales/en-US/brand.ftl"        "$BRAND_DIR/locales/en-US/brand.ftl"
cp "$REPO_ROOT/branding/locales/en-US/brand.dtd"        "$BRAND_DIR/locales/en-US/brand.dtd"
cp "$REPO_ROOT/branding/locales/en-US/brand.properties" "$BRAND_DIR/locales/en-US/brand.properties"
cp "$REPO_ROOT/branding/locales/ru/brand.ftl"           "$BRAND_DIR/locales/ru/brand.ftl"
cp "$REPO_ROOT/branding/locales/ru/brand.dtd"           "$BRAND_DIR/locales/ru/brand.dtd"
cp "$REPO_ROOT/branding/locales/ru/brand.properties"    "$BRAND_DIR/locales/ru/brand.properties"

cp "$REPO_ROOT/branding/pref/firefox-branding.js"       "$BRAND_DIR/pref/firefox-branding.js" 2>/dev/null || \
  install -D "$REPO_ROOT/branding/pref/firefox-branding.js" "$BRAND_DIR/pref/firefox-branding.js"

cp "$REPO_ROOT/branding/configure/moz.build"            "$BRAND_DIR/moz.build"
cp "$REPO_ROOT/branding/configure/configure.sh.md"      "$BRAND_DIR/README.md" 2>/dev/null || true

echo "OnyxThorn branding installed at $BRAND_DIR"
