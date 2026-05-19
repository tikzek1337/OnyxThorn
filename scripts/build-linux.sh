#!/usr/bin/env bash
# Build OnyxThorn for Linux. Produces obj-linux/dist/bin/*.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOZ="$REPO_ROOT/mozilla-unified"

if [ ! -d "$MOZ" ]; then
  echo "Cloning mozilla-unified..."
  hg clone https://hg.mozilla.org/mozilla-unified "$MOZ"
else
  (cd "$MOZ" && hg pull -u || true)
fi

bash "$REPO_ROOT/scripts/apply-patches.sh" "$MOZ"

cp "$REPO_ROOT/mozconfig/mozconfig-linux" "$MOZ/mozconfig"

cd "$MOZ"
./mach --no-interactive bootstrap --application-choice browser
./mach build
./mach package

echo "Build OK — see $MOZ/obj-linux/dist/"
