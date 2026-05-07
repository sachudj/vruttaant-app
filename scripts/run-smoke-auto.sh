#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
SMOKE_SCRIPT="$REPO_ROOT/scripts/manual-smoke.sh"

START_PORT="${START_PORT:-5001}"
MAX_PORT="${MAX_PORT:-5099}"
WAIT_SECONDS="${WAIT_SECONDS:-25}"

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

wait_for_backend() {
  local base_url="$1"
  local max_tries=$((WAIT_SECONDS * 2))
  local i

  for ((i=1; i<=max_tries; i++)); do
    if curl -sS "$base_url/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done

  return 1
}

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    echo "Stopping backend (pid $BACKEND_PID)..."
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

main() {
  require_bin curl
  require_bin lsof
  require_bin npm
  require_bin bash

  if [[ ! -f "$SMOKE_SCRIPT" ]]; then
    echo "Smoke script not found at $SMOKE_SCRIPT"
    exit 1
  fi

  local port
  port="$(find_free_port)"

  echo "Using free port: $port"
  echo "Starting backend..."

  trap cleanup EXIT INT TERM

  (
    cd "$BACKEND_DIR"
    PORT="$port" npm start
  ) >/tmp/vruttaant-backend-smoke.log 2>&1 &
  BACKEND_PID=$!

  local base_url
  base_url="http://localhost:$port"

  if ! wait_for_backend "$base_url"; then
    echo "Backend did not become ready within $WAIT_SECONDS seconds."
    echo "Backend logs:"
    sed -n '1,120p' /tmp/vruttaant-backend-smoke.log || true
    exit 1
  fi

  echo "Backend is up at $base_url"
  echo "Running smoke checks..."

  BASE_URL="$base_url" bash "$SMOKE_SCRIPT"
}

main "$@"
