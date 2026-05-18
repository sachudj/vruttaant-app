#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
START_PORT="${START_PORT:-5000}"
MAX_PORT="${MAX_PORT:-5099}"
WAIT_SECONDS="${WAIT_SECONDS:-20}"
BACKEND_LOG="${BACKEND_LOG:-/tmp/vruttaant-backend-health.log}"
BACKEND_PID_FILE="${BACKEND_PID_FILE:-/tmp/vruttaant-backend-health.pid}"

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1"
    exit 1
  fi
}

is_port_free() {
  local port="$1"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

find_free_port() {
  local port
  for ((port=START_PORT; port<=MAX_PORT; port++)); do
    if is_port_free "$port"; then
      echo "$port"
      return 0
    fi
  done

  echo "No free port found in range $START_PORT-$MAX_PORT"
  exit 1
}

cleanup() {
  if [[ -f "$BACKEND_PID_FILE" ]]; then
    local backend_pid
    backend_pid="$(cat "$BACKEND_PID_FILE")"
    if [[ -n "$backend_pid" ]] && kill -0 "$backend_pid" >/dev/null 2>&1; then
      kill "$backend_pid" >/dev/null 2>&1 || true
      wait "$backend_pid" 2>/dev/null || true
    fi
    rm -f "$BACKEND_PID_FILE"
  fi
}

trap cleanup EXIT INT TERM

require_bin curl
require_bin lsof

PORT="$(find_free_port)"

rm -f "$BACKEND_LOG" "$BACKEND_PID_FILE"

(
  cd "$BACKEND_DIR"
  PORT="$PORT" MONGODB_URI="${MONGODB_URI-}" npm start
) >"$BACKEND_LOG" 2>&1 &
echo $! >"$BACKEND_PID_FILE"

for _ in $(seq 1 "$WAIT_SECONDS"); do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    curl -fsS "http://127.0.0.1:$PORT/health"
    exit 0
  fi
  sleep 1
done

echo "Backend failed to become healthy on port $PORT"
sed -n '1,160p' "$BACKEND_LOG" || true
exit 1