#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$REPO_ROOT/scripts/backup-mongodb.sh"
RESTORE_SCRIPT="$REPO_ROOT/scripts/restore-mongodb.sh"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/docker-compose.yml}"
VERIFY_DB="${VERIFY_DB:-vruttaant_backup_verify}"
VERIFY_BACKUP_DIR="${VERIFY_BACKUP_DIR:-$REPO_ROOT/backups/mongodb/verify}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:-admin123}"
MONGO_AUTH_DB="${MONGO_AUTH_DB:-admin}"

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1"
    exit 1
  fi
}

resolve_mongo_container() {
  local container_id
  container_id="$(docker compose -f "$COMPOSE_FILE" ps -q mongodb 2>/dev/null || true)"
  if [[ -n "$container_id" ]]; then
    echo "$container_id"
    return 0
  fi

  if docker ps --format '{{.Names}}' | grep -qx 'vruttaant-mongodb'; then
    echo 'vruttaant-mongodb'
    return 0
  fi

  echo "MongoDB container not found. Start infra with: cd backend && npm run infra:up"
  exit 1
}

run_mongosh_eval() {
  local mongo_container="$1"
  local db_name="$2"
  local js="$3"

  docker exec "$mongo_container" mongosh \
    --quiet \
    --username "$MONGO_USER" \
    --password "$MONGO_PASSWORD" \
    --authenticationDatabase "$MONGO_AUTH_DB" \
    "$db_name" \
    --eval "$js"
}

main() {
  require_bin docker
  require_bin bash
  require_bin awk

  local mongo_container
  mongo_container="$(resolve_mongo_container)"

  mkdir -p "$VERIFY_BACKUP_DIR"

  echo "Preparing deterministic verification dataset in '$VERIFY_DB'..."
  run_mongosh_eval "$mongo_container" "$VERIFY_DB" "db.dropDatabase(); db.restore_probe.insertMany([{ marker: 'alpha', value: 1 }, { marker: 'beta', value: 2 }, { marker: 'gamma', value: 3 }]);"

  local baseline_count
  baseline_count="$(run_mongosh_eval "$mongo_container" "$VERIFY_DB" "db.restore_probe.countDocuments({})")"

  if [[ "$baseline_count" != "3" ]]; then
    echo "Unexpected baseline count ($baseline_count). Expected 3."
    exit 1
  fi

  DB_NAME="$VERIFY_DB" BACKUP_DIR="$VERIFY_BACKUP_DIR" BACKUP_RETENTION_COUNT=5 bash "$BACKUP_SCRIPT"

  local latest_backup
  latest_backup="$(ls -1t "$VERIFY_BACKUP_DIR"/vruttaant_*.archive.gz 2>/dev/null | head -1 || true)"

  if [[ -z "$latest_backup" ]]; then
    echo "Verification backup was not created."
    exit 1
  fi

  echo "Dropping verification DB before restore..."
  run_mongosh_eval "$mongo_container" "$VERIFY_DB" "db.dropDatabase();"

  DB_NAME="$VERIFY_DB" BACKUP_DIR="$VERIFY_BACKUP_DIR" bash "$RESTORE_SCRIPT" --backup-file "$latest_backup" --drop

  local restored_count
  restored_count="$(run_mongosh_eval "$mongo_container" "$VERIFY_DB" "db.restore_probe.countDocuments({})")"

  if [[ "$restored_count" != "3" ]]; then
    echo "Restore verification failed. Restored count is $restored_count (expected 3)."
    exit 1
  fi

  local restored_markers
  restored_markers="$(run_mongosh_eval "$mongo_container" "$VERIFY_DB" "db.restore_probe.find({}, { _id: 0, marker: 1 }).sort({ marker: 1 }).toArray().map((doc)=>doc.marker).join(',')")"

  if [[ "$restored_markers" != "alpha,beta,gamma" ]]; then
    echo "Restore verification failed. Markers mismatch: $restored_markers"
    exit 1
  fi

  echo "Backup/restore verification passed for DB '$VERIFY_DB'."
}

main "$@"
