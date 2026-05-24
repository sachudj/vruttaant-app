#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/mobile_app"
OUTPUT_DIR="${APK_PUBLISH_DIR:-$ROOT_DIR/artifacts/mobile/android}"
OUTPUT_APK="$OUTPUT_DIR/app-release-latest.apk"
OUTPUT_META="$OUTPUT_DIR/app-release-latest.json"
SOURCE_APK="$MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
DEFINE_FILE="${MOBILE_DEFINE_FILE:-env/production.json}"

cd "$MOBILE_DIR"
flutter build apk --release --dart-define-from-file="$DEFINE_FILE"

if [[ ! -f "$SOURCE_APK" ]]; then
  echo "APK not found at expected path: $SOURCE_APK" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
cp "$SOURCE_APK" "$OUTPUT_APK"

sha256="$(shasum -a 256 "$OUTPUT_APK" | awk '{print $1}')"
apk_size_bytes="$(stat -f%z "$OUTPUT_APK")"
current_commit="$(git -C "$ROOT_DIR" rev-parse HEAD)"

cat >"$OUTPUT_META" <<EOF
{
  "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "sourceApk": "mobile_app/build/app/outputs/flutter-apk/app-release.apk",
  "publishedApk": "artifacts/mobile/android/app-release-latest.apk",
  "gitCommit": "$current_commit",
  "sizeBytes": $apk_size_bytes,
  "sha256": "$sha256"
}
EOF

echo "Published APK: $OUTPUT_APK"
echo "Metadata: $OUTPUT_META"
echo "Size (bytes): $apk_size_bytes"
echo "SHA256: $sha256"
echo ""
echo "Next: git add artifacts/mobile/android && git commit -m \"chore: update latest mobile APK\""
