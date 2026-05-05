#!/usr/bin/env bash
# =============================================================
# Traseallo Driver App — Build signed Android App Bundle (AAB)
# Output: android/app/build/outputs/bundle/release/app-release.aab
# =============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Sanity checks"
if [ ! -f "android/app/google-services.json" ]; then
  echo "ERROR: android/app/google-services.json missing — Firebase will fail."
  exit 1
fi

if [ ! -f "android/keystore.properties" ] && [ -z "${TRASEALLO_RELEASE_STORE_FILE:-}" ]; then
  echo "WARNING: No release signing config found."
  echo "  Create android/keystore.properties (see keystore.properties.example)"
  echo "  or export TRASEALLO_RELEASE_STORE_FILE/PASSWORD/KEY_ALIAS/KEY_PASSWORD."
  echo "  Build will fall back to debug signing (NOT acceptable for Play Store)."
  read -p "Continue with debug signing? [y/N] " yn
  [[ "$yn" =~ ^[Yy]$ ]] || exit 1
fi

if [ -z "${MAPS_API_KEY:-}" ] && ! grep -q "^MAPS_API_KEY=" android/local.properties 2>/dev/null; then
  echo "WARNING: MAPS_API_KEY not set in env or android/local.properties — Maps will be blank."
fi

echo "==> Cleaning previous build"
cd android
./gradlew clean

echo "==> Building release AAB (this takes a few minutes)"
./gradlew bundleRelease

AAB="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB" ]; then
  SIZE=$(du -h "$AAB" | cut -f1)
  echo ""
  echo "==> SUCCESS"
  echo "    AAB: android/$AAB ($SIZE)"
  echo "    Upload to Google Play Console > Production > Create new release."
else
  echo "ERROR: AAB not produced. Check Gradle output above."
  exit 1
fi
