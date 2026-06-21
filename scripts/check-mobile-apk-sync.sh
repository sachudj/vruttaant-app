#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

APK_ARTIFACT_PATH="artifacts/mobile/android/app-release-latest.apk"
APK_METADATA_PATH="artifacts/mobile/android/app-release-latest.json"

cd "$ROOT_DIR"

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "No commits found yet. Skipping APK sync check."
  exit 0
fi

latest_mobile_commit="$(git log -1 --format=%H -- mobile_app ':(exclude)mobile_app/build' || true)"

if [[ -z "$latest_mobile_commit" ]]; then
  echo "No committed mobile_app changes found. APK sync check skipped."
  exit 0
fi

latest_apk_commit="$(git log -1 --format=%H -- "$APK_ARTIFACT_PATH" "$APK_METADATA_PATH" || true)"

if [[ -z "$latest_apk_commit" ]]; then
  echo "Latest APK artifact is missing from git history."
  echo "Run: npm run mobile:publish-apk"
  echo "Then commit: git add artifacts/mobile/android && git commit -m \"chore: update latest mobile APK\""
  exit 1
fi

latest_mobile_time="$(git show -s --format=%ct "$latest_mobile_commit")"
latest_apk_time="$(git show -s --format=%ct "$latest_apk_commit")"

if (( latest_mobile_time > latest_apk_time )); then
  echo "Mobile code is newer than committed latest APK artifact."
  echo "Latest mobile commit: $latest_mobile_commit"
  echo "Latest APK commit: $latest_apk_commit"
  echo "Run: npm run mobile:publish-apk"
  echo "Then commit: git add artifacts/mobile/android && git commit -m \"chore: update latest mobile APK\""
  exit 1
fi

echo "APK sync check passed."
