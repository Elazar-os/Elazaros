#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /absolute/path/to/replit-export.zip"
  exit 1
fi

ZIP_PATH="$1"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Error: zip file not found: $ZIP_PATH"
  exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "Error: unzip is not installed. Install it and retry."
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "Error: rsync is not installed. Install it and retry."
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_DIR="$(mktemp -d)"
EXTRACT_DIR="$TMP_DIR/extracted"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$EXTRACT_DIR"
unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"

# If zip contains a single top-level folder, use it as source.
SOURCE_DIR="$EXTRACT_DIR"
ENTRY_COUNT="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')"
if [[ "$ENTRY_COUNT" == "1" ]]; then
  FIRST_ENTRY="$(find "$EXTRACT_DIR" -mindepth 1 -maxdepth 1)"
  if [[ -d "$FIRST_ENTRY" ]]; then
    SOURCE_DIR="$FIRST_ENTRY"
  fi
fi

echo "Importing files from: $SOURCE_DIR"
echo "Into repository: $REPO_ROOT"

# Keep .git and migration helper files in this repo.
rsync -a --delete \
  --exclude='.git/' \
  --exclude='README.md' \
  --exclude='MIGRATE_REPLIT_TO_CLOUDFLARE.md' \
  --exclude='scripts/import-replit-zip.sh' \
  "$SOURCE_DIR"/ "$REPO_ROOT"/

echo
echo "Import complete."
echo "Next steps:"
echo "  1) Review changes: git status"
echo "  2) Commit: git add . && git commit -m 'Import project from Replit zip'"
echo "  3) Push: git push -u origin main"
