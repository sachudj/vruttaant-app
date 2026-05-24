#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups/mongodb}"
DB_NAME="${DB_NAME:-vruttaant}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:-admin123}"
MONGO_AUTH_DB="${MONGO_AUTH_DB:-admin}"

USE_LATEST=false
BACKUP_FILE=""
DRY_RUN=false
DROP_EXISTING=false

usage() {
  cat <<'EOF'
Usage:
  bash scripts/restore-mongodb.sh [--latest | --backup-file <path>] [--dry-run] [--drop]

Options:
  --latest                Restore the newest backup from BACKUP_DIR.
  --backup-file <path>    Restore an explicit archive path.
  --dry-run               Validate inputs/checksum only; do not restore.
  --drop                  Drop target collections before restore.
  -h, --help              Show this help.
EOF
}

require_bin() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1"
    exit 1
  fi
}

compute_sha256() {
  local target_file="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target_file" | awk '{print $1}'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target_file" | awk '{print $1}'
    return 0
  fi

  echo "Missing required tool: sha256sum or shasum"
  exit 1
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

resolve_backup_file() {
  if [[ "$USE_LATEST" == true ]]; then
    BACKUP_FILE="$(ls -1t "$BACKUP_DIR"/vruttaant_*.archive.gz 2>/dev/null | head -1 || true)"
  fi

  if [[ -z "$BACKUP_FILE" ]]; then
    echo "No backup archive selected. Use --latest or --backup-file."
    exit 1
  fi

  if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
  fi
}

verify_checksum() {
  local checksum_file
  checksum_file="$BACKUP_FILE.sha256"

  if [[ ! -f "$checksum_file" ]]; then
    echo "Checksum file missing: $checksum_file"
    exit 1
  fi

  local expected
  expected="$(tr -d '[:space:]' < "$checksum_file")"
  local actual
  actual="$(compute_sha256 "$BACKUP_FILE")"

  if [[ "$expected" != "$actual" ]]; then
    echo "Checksum verification failed for $BACKUP_FILE"
    echo "Expected: $expected"
    echo "Actual:   $actual"
    exit 1
  fi

  echo "Checksum verified for $BACKUP_FILE"
}

print_post_restore_stats() {
  local mongo_container="$1"

  docker exec "$mongo_container" mongosh \
    --quiet \
    --username "$MONGO_USER" \
    --password "$MONGO_PASSWORD" \
    --authenticationDatabase "$MONGO_AUTH_DB" \
    "$DB_NAME" \
    --eval "const collections=['newscards','users','bookmarks','useractivityevents','usercohorts']; collections.forEach((name)=>{ const exists=db.getCollectionNames().includes(name); const count=exists?db.getCollection(name).countDocuments({}):0; print(name + ': ' + count); });"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --latest)
        USE_LATEST=true
        shift
        ;;
      --backup-file)
        BACKUP_FILE="${2:-}"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --drop)
        DROP_EXISTING=true
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1"
        usage
        exit 1
        ;;
    esac
  done

  if [[ "$USE_LATEST" == true && -n "$BACKUP_FILE" ]]; then
    echo "Use either --latest or --backup-file, not both."
    exit 1
  fi
}

main() {
  parse_args "$@"

  require_bin docker
  require_bin awk
  require_bin head

  resolve_backup_file
  verify_checksum

  if [[ "$DRY_RUN" == true ]]; then
    echo "Dry-run successful. Restore skipped for: $BACKUP_FILE"
    exit 0
  fi

  local mongo_container
  mongo_container="$(resolve_mongo_container)"
  local archive_name
  archive_name="$(basename "$BACKUP_FILE")"
  local container_archive
  container_archive="/tmp/$archive_name"

  docker cp "$BACKUP_FILE" "$mongo_container:$container_archive"

  local restore_cmd
  restore_cmd=(mongorestore --username "$MONGO_USER" --password "$MONGO_PASSWORD" --authenticationDatabase "$MONGO_AUTH_DB" --gzip --archive="$container_archive" --nsInclude "$DB_NAME.*" --nsFrom "$DB_NAME.*" --nsTo "$DB_NAME.*")

  if [[ "$DROP_EXISTING" == true ]]; then
    restore_cmd+=(--drop)
  fi

  echo "Restoring DB '$DB_NAME' from $BACKUP_FILE..."
  docker exec "$mongo_container" "${restore_cmd[@]}"
  docker exec "$mongo_container" rm -f "$container_archive"

  echo "Restore complete. Post-restore collection counts:"
  print_post_restore_stats "$mongo_container"
}

main "$@"
