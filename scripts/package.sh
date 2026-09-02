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
need npm

# Validate fixture data matches expected API shape before packaging
echo "Validating fixture data..."
node "$ROOT/scripts/validate-fixtures.js" || die "Fixture validation failed — fix errors above before releasing."
echo ""

# Auto-increment the patch digit in package.json — it is the build counter.
# Each packaging run bumps 0.2.4 → 0.2.5 → 0.2.6 etc.
CURRENT=$(node -p "require('$APP/package.json').version")
MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
PATCH=$(echo "$CURRENT" | cut -d. -f3)
NEW_PATCH=$(( PATCH + 1 ))
VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
DISPLAY="${MAJOR}.${MINOR}.$(printf "%03d" $NEW_PATCH)"

node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('$APP/package.json', 'utf8'));
  p.version = '$VERSION';
  fs.writeFileSync('$APP/package.json', JSON.stringify(p, null, 2) + '\n');
"

ARCHIVE_NAME="intigriti-reporting-workbench-${DISPLAY}.zip"
STAGING="$OUT/_staging/intigriti-reporting-workbench"

echo "Packaging Intigriti Reporting Workbench v${DISPLAY}..."

# ── Build the app ──────────────────────────────────────────────────────────────
echo "Installing dependencies..."
cd "$APP"
npm ci --prefer-offline 2>&1 | tail -n1

echo "Building..."
npm run build 2>&1 | grep -E "^(vite|dist/|error)" || true
[ -d "$APP/dist" ] || die "Build failed — dist/ not created."

echo ""

# Clean staging area
rm -rf "$OUT/_staging"
mkdir -p "$STAGING"

# Copy built output only — no source code shipped
cp -r "$APP/dist" "$STAGING/dist"

# Copy server and docs
cp "$ROOT/server.mjs"         "$STAGING/server.mjs"
cp "$APP/README.md"           "$STAGING/README.md"
cp "$APP/REPORT_MODULE_GUIDE.md" "$STAGING/REPORT_MODULE_GUIDE.md" 2>/dev/null || true

# ── Start scripts ──────────────────────────────────────────────────────────────
cat > "$STAGING/start.sh" << 'STARTSCRIPT'
#!/usr/bin/env bash
# Start the Intigriti Reporting Workbench
cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
  echo ""
  echo "  Node.js is not installed."
  echo ""
  echo "  Install it from:  https://nodejs.org  (LTS recommended)"
  echo ""
  echo "  Or use a version manager:"
  echo "    macOS / Linux:  https://github.com/nvm-sh/nvm"
  echo "    Windows:        https://github.com/coreybutler/nvm-windows"
  echo ""
  exit 1
fi

NODE_MAJOR="$(node -e 'process.stdout.write(process.version.split(".")[0].slice(1))')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo ""
  echo "  Node.js v$NODE_MAJOR is installed, but v18 or later is required."
  echo "  Download the latest LTS from:  https://nodejs.org"
  echo ""
  exit 1
fi

exec node server.mjs
STARTSCRIPT
chmod +x "$STAGING/start.sh"

cat > "$STAGING/start.bat" << 'STARTBAT'
@echo off
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   Node.js is not installed.
  echo.
  echo   Install it from:  https://nodejs.org  ^(LTS recommended^)
  echo.
  echo   Or via winget:    winget install OpenJS.NodeJS.LTS
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -e "process.stdout.write(process.version.split(\".\")[0].slice(1))"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% lss 18 (
  echo.
  echo   Node.js v%NODE_MAJOR% is installed, but v18 or later is required.
  echo   Download the latest LTS from:  https://nodejs.org
  echo.
  pause
  exit /b 1
)

node server.mjs
pause
STARTBAT

cat > "$STAGING/start.ps1" << 'STARTPS1'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "  Node.js is not installed."
  Write-Host ""
  Write-Host "  Install it from:  https://nodejs.org  (LTS recommended)"
  Write-Host ""
  Write-Host "  Or via winget:    winget install OpenJS.NodeJS.LTS"
  Write-Host "  Or via choco:     choco install nodejs-lts"
  Write-Host ""
  Read-Host "Press Enter to exit"
  exit 1
}

$nodeMajor = [int](node -e 'process.stdout.write(process.version.split(".")[0].slice(1))')
if ($nodeMajor -lt 18) {
  Write-Host ""
  Write-Host "  Node.js v$nodeMajor is installed, but v18 or later is required."
  Write-Host "  Download the latest LTS from:  https://nodejs.org"
  Write-Host ""
  Read-Host "Press Enter to exit"
  exit 1
}

node server.mjs
STARTPS1

# ── Create zip ─────────────────────────────────────────────────────────────────
# Strip macOS metadata before zipping
find "$STAGING" -name ".DS_Store" -delete
find "$STAGING" -name "__MACOSX" -exec rm -rf {} + 2>/dev/null || true

cd "$OUT/_staging"
zip -r "$OUT/$ARCHIVE_NAME" "intigriti-reporting-workbench/" --quiet

# Cleanup
rm -rf "$OUT/_staging"

echo "Package ready → dist/$ARCHIVE_NAME"
echo ""
echo "Contents:"
echo "  start.sh        — launch the workbench (macOS / Linux)"
echo "  start.bat       — launch the workbench (Windows — double-click or CMD)"
echo "  start.ps1       — launch the workbench (Windows PowerShell)"
echo "  server.mjs      — standalone Node.js server (no npm install required)"
echo "  dist/           — built app (live and mock modes)"
echo "  README.md       — setup and usage guide"
