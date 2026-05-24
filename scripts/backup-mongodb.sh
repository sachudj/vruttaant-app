#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_ROOT/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups/mongodb}"
DB_NAME="${DB_NAME:-vruttaant}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:-admin123}"
MONGO_AUTH_DB="${MONGO_AUTH_DB:-admin}"
BACKUP_RETENTION_COUNT="${BACKUP_RETENTION_COUNT:-14}"

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

prune_old_backups() {
  local backups_list
  backups_list="$(ls -1t "$BACKUP_DIR"/vruttaant_*.archive.gz 2>/dev/null || true)"
  if [[ -z "$backups_list" ]]; then
    return 0
  fi

  local remove_list
  remove_list="$(echo "$backups_list" | awk "NR>${BACKUP_RETENTION_COUNT}")"
  if [[ -z "$remove_list" ]]; then
    return 0
  fi

  while IFS= read -r old_archive; do
    [[ -z "$old_archive" ]] && continue
    rm -f "$old_archive" "$old_archive.sha256" "$old_archive.meta"
    echo "Pruned old backup: $(basename "$old_archive")"
  done <<< "$remove_list"
}

main() {
  require_bin docker
  require_bin awk
  require_bin ls
  require_bin date
  require_bin mkdir

  local mongo_container
  mongo_container="$(resolve_mongo_container)"

  mkdir -p "$BACKUP_DIR"

  local timestamp
  timestamp="$(date +%Y%m%d_%H%M%S)"
  local archive_name
  archive_name="vruttaant_${timestamp}.archive.gz"
  local container_archive
  container_archive="/tmp/${archive_name}"
  local backup_path
  backup_path="$BACKUP_DIR/$archive_name"

  echo "Creating backup for DB '$DB_NAME' from container '$mongo_container'..."
  docker exec "$mongo_container" mongodump \
    --username "$MONGO_USER" \
    --password "$MONGO_PASSWORD" \
    --authenticationDatabase "$MONGO_AUTH_DB" \
    --db "$DB_NAME" \
    --gzip \
    --archive="$container_archive"

  docker cp "$mongo_container:$container_archive" "$backup_path"
  docker exec "$mongo_container" rm -f "$container_archive"

  local checksum
  checksum="$(compute_sha256 "$backup_path")"
  echo "$checksum" > "$backup_path.sha256"

  cat > "$backup_path.meta" <<EOF
backupFile=$(basename "$backup_path")
createdAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)
database=$DB_NAME
authDatabase=$MONGO_AUTH_DB
mongoContainer=$mongo_container
retentionCount=$BACKUP_RETENTION_COUNT
checksumSha256=$checksum
EOF

  prune_old_backups

  echo "Backup created: $backup_path"
  echo "Checksum file: $backup_path.sha256"
  echo "Metadata file: $backup_path.meta"
}

main "$@"
