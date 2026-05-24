#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_PLATFORM="${TARGET_PLATFORM:-android-arm64}"
MAX_APK_SIZE_MB="${MAX_APK_SIZE_MB:-20}"
APK_PATH="$ROOT_DIR/mobile_app/build/app/outputs/flutter-apk/app-release.apk"
SIZE_ANALYSIS_DIR="$ROOT_DIR/mobile_app/build/size-analysis"
METADATA_PATH="$SIZE_ANALYSIS_DIR/apk-size-metadata.json"

get_file_size_bytes() {
	local file_path="$1"

	if stat -c%s "$file_path" >/dev/null 2>&1; then
		stat -c%s "$file_path"
		return 0
	fi

	stat -f%z "$file_path"
}

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

apk_size_bytes="$(get_file_size_bytes "$APK_PATH")"
max_apk_size_bytes="$((MAX_APK_SIZE_MB * 1024 * 1024))"

echo "APK size: $apk_size_bytes bytes"
echo "APK budget: $max_apk_size_bytes bytes (${MAX_APK_SIZE_MB} MB)"

cat >"$METADATA_PATH" <<EOF
{
	"targetPlatform": "$TARGET_PLATFORM",
	"apkPath": "$APK_PATH",
	"apkSizeBytes": $apk_size_bytes,
	"apkBudgetBytes": $max_apk_size_bytes,
	"maxApkSizeMb": $MAX_APK_SIZE_MB,
	"generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "APK metadata: $METADATA_PATH"

if (( apk_size_bytes > max_apk_size_bytes )); then
	echo "APK size budget exceeded: ${apk_size_bytes} bytes > ${max_apk_size_bytes} bytes" >&2
	exit 1
fi