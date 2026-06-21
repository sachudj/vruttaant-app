#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET_PLATFORM="${TARGET_PLATFORM:-android-arm64}"
MAX_APK_GROWTH_PERCENT="${MAX_APK_GROWTH_PERCENT:-4}"
BASELINE_FILE="${APK_SIZE_BASELINE_FILE:-$ROOT_DIR/mobile_app/env/apk-size-baseline.json}"
METADATA_FILE="${APK_SIZE_METADATA_FILE:-$ROOT_DIR/mobile_app/build/size-analysis/apk-size-metadata.json}"
SUMMARY_FILE="${APK_SIZE_TREND_SUMMARY_FILE:-$ROOT_DIR/mobile_app/build/size-analysis/apk-size-trend-summary.md}"
APK_PATH="$ROOT_DIR/mobile_app/app/build/outputs/apk/release/app-release-unsigned.apk"

get_file_size_bytes() {
  local file_path="$1"

  if stat -c%s "$file_path" >/dev/null 2>&1; then
    stat -c%s "$file_path"
    return 0
  fi

  stat -f%z "$file_path"
}

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "APK baseline file not found: $BASELINE_FILE" >&2
  exit 1
fi

current_apk_size=""

if [[ -f "$METADATA_FILE" ]]; then
  current_apk_size="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(p.apkSizeBytes||''));" "$METADATA_FILE")"
fi

if [[ -z "$current_apk_size" ]]; then
  if [[ ! -f "$APK_PATH" ]]; then
    SIGNED_APK="${APK_PATH%-unsigned.apk}.apk"
    if [[ -f "$SIGNED_APK" ]]; then
      APK_PATH="$SIGNED_APK"
    else
      echo "Unable to resolve current APK size from metadata or APK path." >&2
      exit 1
    fi
  fi
  current_apk_size="$(get_file_size_bytes "$APK_PATH")"
fi

baseline_apk_size="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const platform=process.argv[2];const value=p?.platforms?.[platform]?.baselineBytes;process.stdout.write(String(value||''));" "$BASELINE_FILE" "$TARGET_PLATFORM")"

if [[ -z "$baseline_apk_size" ]]; then
  echo "Missing baselineBytes for platform '$TARGET_PLATFORM' in $BASELINE_FILE" >&2
  exit 1
fi

allowed_growth_bytes="$(( baseline_apk_size * MAX_APK_GROWTH_PERCENT / 100 ))"
max_allowed_bytes="$(( baseline_apk_size + allowed_growth_bytes ))"
size_delta_bytes="$(( current_apk_size - baseline_apk_size ))"

if (( baseline_apk_size > 0 )); then
  growth_percent="$(node -e "const delta=Number(process.argv[1]); const baseline=Number(process.argv[2]); process.stdout.write(((delta*100)/baseline).toFixed(2));" -- "$size_delta_bytes" "$baseline_apk_size")"
else
  growth_percent="0.00"
fi

mkdir -p "$(dirname "$SUMMARY_FILE")"
cat >"$SUMMARY_FILE" <<EOF
## Mobile APK Trend Gate

- Platform: $TARGET_PLATFORM
- Current APK size: $current_apk_size bytes
- Baseline APK size: $baseline_apk_size bytes
- Allowed growth: +$MAX_APK_GROWTH_PERCENT% ($allowed_growth_bytes bytes)
- Maximum allowed size: $max_allowed_bytes bytes
- Observed delta: $size_delta_bytes bytes ($growth_percent%)
- Baseline file: $BASELINE_FILE
EOF

echo "APK trend summary: $SUMMARY_FILE"
echo "Current APK size: $current_apk_size bytes"
echo "Baseline APK size: $baseline_apk_size bytes"
echo "Allowed growth: +$MAX_APK_GROWTH_PERCENT% ($allowed_growth_bytes bytes)"
echo "Maximum allowed: $max_allowed_bytes bytes"
echo "Observed delta: $size_delta_bytes bytes ($growth_percent%)"

if (( current_apk_size > max_allowed_bytes )); then
  echo "APK trend gate failed: current APK exceeds allowed growth threshold." >&2
  exit 1
fi

echo "APK trend gate passed."
