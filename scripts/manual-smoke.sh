#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BASH_VERSION:-}" ]]; then
  echo "This script requires bash. Run: bash scripts/manual-smoke.sh"
  exit 1
fi

resolve_default_base_url() {
  if [[ -n "${BASE_URL:-}" ]]; then
    printf '%s' "$BASE_URL"
    return
  fi

  local env_port
  env_port="$(grep -E '^PORT=' backend/.env 2>/dev/null | head -n 1 | cut -d '=' -f 2- | tr -d '[:space:]' || true)"

  if [[ -n "$env_port" ]]; then
    printf 'http://localhost:%s' "$env_port"
    return
  fi

  printf '%s' 'http://localhost:5000'
}

BASE_URL="$(resolve_default_base_url)"
API_BASE="${API_BASE:-${BASE_URL}/api/v1}"
REQUIRE_ADMIN_SUCCESS="${REQUIRE_ADMIN_SUCCESS:-false}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

log_pass() {
  printf "${GREEN}PASS${NC} %s\n" "$1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  printf "${RED}FAIL${NC} %s\n" "$1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_skip() {
  printf "${YELLOW}SKIP${NC} %s\n" "$1"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1"
    exit 1
  fi
}

extract_json() {
  local json="$1"
  local path="$2"
  printf '%s' "$json" | jq -r "$path"
}

request() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local auth="${4:-}"

  local response
  if [[ -n "$data" && -n "$auth" ]]; then
    response=$(curl -sS -X "$method" "$url" -H "Content-Type: application/json" -H "Authorization: Bearer $auth" -d "$data" -w "\n%{http_code}")
  elif [[ -n "$data" ]]; then
    response=$(curl -sS -X "$method" "$url" -H "Content-Type: application/json" -d "$data" -w "\n%{http_code}")
  elif [[ -n "$auth" ]]; then
    response=$(curl -sS -X "$method" "$url" -H "Authorization: Bearer $auth" -w "\n%{http_code}")
  else
    response=$(curl -sS -X "$method" "$url" -w "\n%{http_code}")
  fi

  HTTP_BODY="${response%$'\n'*}"
  HTTP_CODE="${response##*$'\n'}"
}

preflight_target_check() {
  local header_file body_file code server_header
  header_file="$(mktemp)"
  body_file="$(mktemp)"

  code="$(curl -sS -D "$header_file" -o "$body_file" -w '%{http_code}' "$BASE_URL/health" || true)"
  server_header="$(grep -i '^Server:' "$header_file" | head -n 1 | sed 's/\r$//' || true)"

  if [[ "$code" == "000" ]]; then
    echo "Cannot connect to $BASE_URL."
    echo "Start backend first, or set BASE_URL explicitly (example: BASE_URL=http://localhost:5001)."
    rm -f "$header_file" "$body_file"
    exit 2
  fi

  if [[ "$code" == "403" && "$server_header" == *"AirTunes"* ]]; then
    echo "Target mismatch: $BASE_URL is served by macOS AirTunes/ControlCenter, not Vruttaant backend."
    echo "Detected header: $server_header"
    echo "Use a free port for backend and rerun with BASE_URL, for example:"
    echo "  PORT=5001 npm --prefix backend start"
    echo "  BASE_URL=http://localhost:5001 bash scripts/manual-smoke.sh"
    rm -f "$header_file" "$body_file"
    exit 2
  fi

  rm -f "$header_file" "$body_file"
}

assert_http_code() {
  local expected="$1"
  local desc="$2"
  if [[ "$HTTP_CODE" == "$expected" ]]; then
    log_pass "$desc"
  else
    log_fail "$desc (expected $expected, got $HTTP_CODE)"
    echo "Response body: $HTTP_BODY"
  fi
}

assert_json_expr_true() {
  local expr="$1"
  local desc="$2"
  if printf '%s' "$HTTP_BODY" | jq -e "$expr" >/dev/null 2>&1; then
    log_pass "$desc"
  else
    log_fail "$desc"
    echo "Response body: $HTTP_BODY"
  fi
}

main() {
  require_bin curl
  require_bin jq

  echo "Running manual smoke checks against: $API_BASE"
  preflight_target_check

  # 1) Health and root metadata
  request GET "$BASE_URL/ready"
  assert_http_code 200 "GET /ready returns 200"
  assert_json_expr_true '.status == "ready"' "GET /ready has ready status"

  request GET "$BASE_URL/health"
  assert_http_code 200 "GET /health returns 200"
  assert_json_expr_true '.status == "ok"' "GET /health has status ok"

  request GET "$BASE_URL/"
  assert_http_code 200 "GET / returns 200"
  assert_json_expr_true '.api == "/api/v1"' "GET / advertises /api/v1"

  # 2) Versioned + legacy route mounts
  request GET "$BASE_URL/api/v1/news/ingest/health"
  assert_http_code 200 "GET /api/v1/news/ingest/health returns 200"

  request GET "$BASE_URL/api/news/ingest/health"
  assert_http_code 200 "GET legacy /api/news/ingest/health returns 200"

  # 3) Validation check (ingest requires valid URL)
  request POST "$API_BASE/news/ingest" '{"url":"not-a-url"}'
  assert_http_code 400 "POST /news/ingest rejects invalid URL"

  # 4) Auth lifecycle
  local ts email password signup_payload login_payload
  ts="$(date +%s)"
  email="smoke-${ts}@example.com"
  password='Password123!'
  signup_payload="{\"email\":\"${email}\",\"password\":\"${password}\"}"
  login_payload="$signup_payload"

  request POST "$API_BASE/auth/signup" "$signup_payload"
  assert_http_code 201 "POST /auth/signup returns 201"
  assert_json_expr_true '.success == true' "Signup response success=true"

  request POST "$API_BASE/auth/login" "$login_payload"
  assert_http_code 200 "POST /auth/login returns 200"
  assert_json_expr_true '.data.tokens.accessToken | type == "string" and length > 20' "Login returns access token"
  assert_json_expr_true '.data.tokens.refreshToken | type == "string" and length > 20' "Login returns refresh token"

  local access_token refresh_token
  access_token="$(extract_json "$HTTP_BODY" '.data.tokens.accessToken')"
  refresh_token="$(extract_json "$HTTP_BODY" '.data.tokens.refreshToken')"

  # 5) Protected route auth checks
  request GET "$API_BASE/user/bookmarks"
  assert_http_code 401 "GET /user/bookmarks without token returns 401"

  request GET "$API_BASE/user/bookmarks" "" "$access_token"
  assert_http_code 200 "GET /user/bookmarks with token returns 200"

  # 6) Bookmark create + duplicate prevention
  local bookmark_payload
  bookmark_payload='{"title":"Smoke Bookmark","url":"https://example.com/smoke","summary":"Smoke test","category":"General","imageUrl":"","source":"Example","language":"en","notes":"created by smoke script"}'

  request POST "$API_BASE/user/bookmarks" "$bookmark_payload" "$access_token"
  assert_http_code 201 "POST /user/bookmarks creates bookmark"
  assert_json_expr_true '.data.bookmark.id | type == "string" and length > 10' "Create bookmark returns id"

  local bookmark_id
  bookmark_id="$(extract_json "$HTTP_BODY" '.data.bookmark.id')"

  request POST "$API_BASE/user/bookmarks" "$bookmark_payload" "$access_token"
  assert_http_code 409 "POST /user/bookmarks blocks duplicate URL"

  request GET "$API_BASE/user/bookmarks?page=1&limit=10&language=en" "" "$access_token"
  assert_http_code 200 "GET /user/bookmarks with query params returns 200"
  assert_json_expr_true '.data.pagination.page == 1 and .data.pagination.limit == 10' "Bookmark list pagination returned"

  # 7) Refresh token rotation + revocation
  request POST "$API_BASE/auth/refresh" "{\"refreshToken\":\"${refresh_token}\"}"
  assert_http_code 200 "POST /auth/refresh returns 200"
  assert_json_expr_true '.data.tokens.refreshToken | type == "string" and length > 20' "Refresh returns a new refresh token"

  local rotated_refresh
  rotated_refresh="$(extract_json "$HTTP_BODY" '.data.tokens.refreshToken')"

  request POST "$API_BASE/auth/refresh" "{\"refreshToken\":\"${refresh_token}\"}"
  assert_http_code 401 "Old refresh token is rejected after rotation"

  request POST "$API_BASE/auth/logout" "{\"refreshToken\":\"${rotated_refresh}\"}"
  assert_http_code 200 "POST /auth/logout returns 200"

  request POST "$API_BASE/auth/refresh" "{\"refreshToken\":\"${rotated_refresh}\"}"
  assert_http_code 401 "Logged-out refresh token is rejected"

  # 8) Bookmark delete (ownership path for same user)
  request DELETE "$API_BASE/user/bookmarks/${bookmark_id}" "" "$access_token"
  assert_http_code 200 "DELETE /user/bookmarks/:id returns 200 for owner"

  # 9) RBAC check (non-admin must be forbidden)
  request GET "$API_BASE/admin/health" "" "$access_token"
  assert_http_code 403 "GET /admin/health is forbidden for non-admin"

  request GET "$API_BASE/admin/stats" "" "$access_token"
  assert_http_code 403 "GET /admin/stats is forbidden for non-admin"

  # Optional: verify admin success path if credentials are provided
  if [[ "$REQUIRE_ADMIN_SUCCESS" == "true" ]]; then
    if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
      log_fail "REQUIRE_ADMIN_SUCCESS=true requires ADMIN_EMAIL and ADMIN_PASSWORD"
    else
      request POST "$API_BASE/auth/login" "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}"
      assert_http_code 200 "Admin login returns 200"

      local admin_access
      admin_access="$(extract_json "$HTTP_BODY" '.data.tokens.accessToken')"

      request GET "$API_BASE/admin/health" "" "$admin_access"
      assert_http_code 200 "GET /admin/health returns 200 for admin"

      request GET "$API_BASE/admin/stats" "" "$admin_access"
      assert_http_code 200 "GET /admin/stats returns 200 for admin"
    fi
  else
    log_skip "Admin success path not run (set REQUIRE_ADMIN_SUCCESS=true to enable)"
  fi

  echo
  echo "Summary: PASS=$PASS_COUNT FAIL=$FAIL_COUNT SKIP=$SKIP_COUNT"

  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
