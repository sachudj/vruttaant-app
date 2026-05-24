#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DOC="$REPO_ROOT/docs/API_ENDPOINTS.md"

if [[ ! -f "$API_DOC" ]]; then
  echo "Missing docs file: $API_DOC"
  exit 1
fi

required_patterns=(
  "/api/v1/news/cards"
  "/api/v1/news/recommended"
  "/api/v1/news/translate"
  "/api/v1/auth/login"
  "/api/v1/user/profile"
  "/api/v1/user/activity/history"
  "/api/v1/user/badges"
  "/api/v1/admin/release-telemetry"
  "/api/v1/admin/loadtest/trends"
  "/api/v1/analytics/events"
)

for pattern in "${required_patterns[@]}"; do
  if ! grep -q "$pattern" "$API_DOC"; then
    echo "API docs parity check failed: missing '$pattern' in docs/API_ENDPOINTS.md"
    exit 1
  fi
done

forbidden_patterns=(
  "Current API version: v0"
  "Authentication"
  "Currently **not implemented**"
)

# Only reject legacy stale claims when they appear in the old API docs context.
if grep -q "Current API version: v0" "$API_DOC"; then
  echo "API docs parity check failed: stale version marker found (v0)."
  exit 1
fi

if grep -q "Rate Limiting[[:space:]]*$" "$API_DOC" && grep -q "Currently \*\*not implemented\*\*" "$API_DOC"; then
  echo "API docs parity check failed: rate limiting still marked as not implemented."
  exit 1
fi

if grep -q "Authentication[[:space:]]*$" "$API_DOC" && grep -q "Currently \*\*not implemented\*\*" "$API_DOC"; then
  echo "API docs parity check failed: authentication still marked as not implemented."
  exit 1
fi

echo "API docs parity check passed."
