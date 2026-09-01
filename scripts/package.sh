#!/usr/bin/env bash
# package.sh — bundle the Intigriti Reporting Workbench for distribution
#
# Usage:
#   ./scripts/package.sh                    — package the full workbench
#   ./scripts/package.sh module <name>      — package a single report module
#   ./scripts/package.sh install <zip>      — install a report module from a zip

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
OUT="$ROOT/dist"
MODE="${1:-release}"

# ── Helpers ────────────────────────────────────────────────────────────────────
die() { echo "Error: $*" >&2; exit 1; }
need() { command -v "$1" &>/dev/null || die "'$1' is required but not found."; }

# ── Package a single report module ────────────────────────────────────────────
if [ "$MODE" = "module" ]; then
  need zip
  MODULE="${2:-}"
  [ -n "$MODULE" ] || die "Usage: ./scripts/package.sh module <module-directory-name>"
  MODULE_PATH="$APP/src/reports/$MODULE"
  [ -d "$MODULE_PATH" ] || die "Module directory not found: src/reports/$MODULE"

  mkdir -p "$OUT"
  ARCHIVE="$OUT/inti-module-${MODULE}.zip"
  cd "$APP/src/reports"
  zip -r "$ARCHIVE" "$MODULE/" --quiet
  echo "Module packaged → $ARCHIVE"
  echo
  echo "To share: send $ARCHIVE to other workbench users."
  echo "To install: ./scripts/package.sh install $ARCHIVE"
  exit 0
fi

# ── Install a report module from a zip ────────────────────────────────────────
if [ "$MODE" = "install" ]; then
  need unzip
  ZIP="${2:-}"
  [ -n "$ZIP" ] || die "Usage: ./scripts/package.sh install <module.zip>"
  [ -f "$ZIP" ] || die "File not found: $ZIP"

  DEST="$APP/src/reports"
  unzip -o "$ZIP" -d "$DEST" --quiet

  # Find the module name from the extracted directory
  MODULE_NAME="$(unzip -Z1 "$ZIP" | head -n1 | cut -d/ -f1)"
  echo "Module installed → src/reports/$MODULE_NAME"
  echo
  echo "Next steps:"
  echo "  1. Open app/src/reports/registry.ts"
  echo "  2. Add:  import { $MODULE_NAME } from './$MODULE_NAME'"
  echo "  3. Add '$MODULE_NAME' to the ALL_MODULES array"
  echo "  4. Restart 'npm run dev' — the report card will appear immediately"
  exit 0
fi

# ── Full workbench release ─────────────────────────────────────────────────────
if [ "$MODE" != "release" ]; then
  echo "Usage:"
  echo "  ./scripts/package.sh                    — package the full workbench"
  echo "  ./scripts/package.sh module <name>      — package a single report module"
  echo "  ./scripts/package.sh install <zip>      — install a report module"
  exit 1
fi

need zip
need node

VERSION="${2:-$(node -p "require('$APP/package.json').version" 2>/dev/null || date +%Y%m%d)}"
STAMP="$(date +%Y%m%d)"
ARCHIVE_NAME="intigriti-reporting-workbench-${VERSION}-${STAMP}.zip"
STAGING="$OUT/_staging/intigriti-reporting-workbench"

echo "Packaging Intigriti Reporting Workbench v${VERSION}..."

# Clean staging area
rm -rf "$OUT/_staging"
mkdir -p "$STAGING/app"

# Copy app source — exclude build artifacts and dev files
cp -r "$APP/src"             "$STAGING/app/src"
cp -r "$APP/public"          "$STAGING/app/public"
cp    "$APP/package.json"    "$STAGING/app/package.json"
cp    "$APP/package-lock.json" "$STAGING/app/package-lock.json" 2>/dev/null || true
cp    "$APP/index.html"      "$STAGING/app/index.html"
cp    "$APP/vite.config.ts"  "$STAGING/app/vite.config.ts"
cp    "$APP/tsconfig.json"   "$STAGING/app/tsconfig.json"
cp    "$APP/tailwind.config.js" "$STAGING/app/tailwind.config.js"
cp    "$APP/postcss.config.js"  "$STAGING/app/postcss.config.js"

# Copy docs
cp "$APP/README.md"               "$STAGING/README.md"
cp "$APP/REPORT_MODULE_GUIDE.md"  "$STAGING/REPORT_MODULE_GUIDE.md" 2>/dev/null || true

# Copy packaging scripts
mkdir -p "$STAGING/scripts"
cp "$ROOT/scripts/package.sh" "$STAGING/scripts/package.sh"
chmod +x "$STAGING/scripts/package.sh"

# ── Start scripts ──────────────────────────────────────────────────────────────
cat > "$STAGING/start.sh" << 'STARTSCRIPT'
#!/usr/bin/env bash
# Start the Intigriti Reporting Workbench
set -e
cd "$(dirname "$0")/app"
if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)..."
  npm install
fi
echo ""
echo "  Starting Intigriti Reporting Workbench"
echo "  Open → http://localhost:5173"
echo "  Press Ctrl+C to stop"
echo ""
exec npm run dev
STARTSCRIPT
chmod +x "$STAGING/start.sh"

cat > "$STAGING/start-mock.sh" << 'MOCKSCRIPT'
#!/usr/bin/env bash
# Start the Intigriti Reporting Workbench in mock mode (no API key required)
set -e
cd "$(dirname "$0")/app"
if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)..."
  npm install
fi
echo ""
echo "  Starting in mock mode — all reports use built-in sample data"
echo "  Open → http://localhost:5173"
echo "  Press Ctrl+C to stop"
echo ""
exec npm run dev:mock
MOCKSCRIPT
chmod +x "$STAGING/start-mock.sh"

# ── Create zip ─────────────────────────────────────────────────────────────────
# Strip macOS metadata before zipping
find "$STAGING" -name ".DS_Store" -delete
find "$STAGING" -name "__MACOSX" -exec rm -rf {} + 2>/dev/null || true

mkdir -p "$OUT"
rm -f "$OUT/$ARCHIVE_NAME"
cd "$OUT/_staging"
zip -r "$OUT/$ARCHIVE_NAME" "intigriti-reporting-workbench/" --quiet

# Cleanup
rm -rf "$OUT/_staging"

echo ""
echo "Package ready → dist/$ARCHIVE_NAME"
echo ""
echo "Contents:"
echo "  start.sh                  — run the workbench (installs dependencies on first use)"
echo "  start-mock.sh             — run with sample data, no API key needed"
echo "  app/                      — source code"
echo "  README.md                 — setup and usage guide"
echo "  REPORT_MODULE_GUIDE.md    — guide to building custom report modules"
echo "  scripts/package.sh        — packaging utilities for report modules"
