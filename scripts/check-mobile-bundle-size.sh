#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_PLATFORM="${TARGET_PLATFORM:-android-arm64}"
MAX_APK_SIZE_MB="${MAX_APK_SIZE_MB:-20}"
APK_PATH="$ROOT_DIR/mobile_app/build/app/outputs/flutter-apk/app-release.apk"
SIZE_ANALYSIS_DIR="$ROOT_DIR/mobile_app/build/size-analysis"

cd "$ROOT_DIR/mobile_app"
flutter build apk --release --analyze-size --target-platform "$TARGET_PLATFORM"

mkdir -p "$SIZE_ANALYSIS_DIR"

latest_analysis_file="$(ls -t "$HOME"/.flutter-devtools/*-code-size-analysis_*.json 2>/dev/null | head -n 1 || true)"
if [[ -n "$latest_analysis_file" ]]; then
	cp "$latest_analysis_file" "$SIZE_ANALYSIS_DIR/"
fi

if [[ ! -f "$APK_PATH" ]]; then
	echo "Expected APK not found at $APK_PATH" >&2
	exit 1
fi

apk_size_bytes="$(stat -f%z "$APK_PATH")"
max_apk_size_bytes="$((MAX_APK_SIZE_MB * 1024 * 1024))"

echo "APK size: $apk_size_bytes bytes"
echo "APK budget: $max_apk_size_bytes bytes (${MAX_APK_SIZE_MB} MB)"

if (( apk_size_bytes > max_apk_size_bytes )); then
	echo "APK size budget exceeded: ${apk_size_bytes} bytes > ${max_apk_size_bytes} bytes" >&2
	exit 1
fi