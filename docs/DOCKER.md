# Docker & MongoDB Setup

## What's Included

The `docker-compose.yml` defines two services:

### 1. MongoDB 7 Container
- **Image**: mongo:7
- **Port**: 27017
- **Credentials**:
  - Username: `admin`
  - Password: `admin123`
  - Database: `vruttaant`
- **Storage**: Named volume `mongo_data` for persistence
- **Health Check**: Every 10 seconds

### 2. Mongo Express (Optional Web UI)
- **Image**: mongo-express:1.0.2
- **Port**: 8081
- **Credentials**: Same as MongoDB
- **Auto-start**: When MongoDB is healthy

## Starting Services

### From Repository Root
```bash
docker compose up -d
```

### From Backend Directory (Using npm Script)
```bash
cd backend
npm run infra:up
```

Both commands start MongoDB and Mongo Express in the background.

## Checking Status

### From Repository Root
```bash
docker compose ps
```

### From Backend Directory
```bash
cd backend
npm run infra:ps
```

Expected output:
```
NAME                IMAGE     COMMAND                  SERVICE   STATUS                PORTS
vruttaant-mongodb   mongo:7   docker-entrypoint.s…     mongodb   Up (healthy)         27017
vruttaant-mongo-express mongo-express:1.0.2  ...  mongo-express  Up            8081
```

## Accessing MongoDB

### Via MongoDB Client
```bash
# Using mongosh (MongoDB shell)
mongosh "mongodb://admin:admin123@127.0.0.1:27017/vruttaant?authSource=admin"
```

### Via Mongo Express Web UI
```
http://localhost:8081
```
- Username: `admin`
- Password: `admin123`

Browse databases, collections, and documents visually.

## Stopping Services

### From Repository Root
```bash
docker compose down
```

### From Backend Directory
```bash
cd backend
npm run infra:down
```

This stops containers but **preserves data** in `mongo_data` volume.

## Removing All Data

```bash
docker compose down -v
```

The `-v` flag removes volumes, **deleting all data**.

## Backend Connection

Backend connects via:
```
MONGODB_URI=mongodb://admin:admin123@127.0.0.1:27017/vruttaant?authSource=admin
```

Set in `backend/.env` (or override with environment variable).

## Database Structure

### Database: `vruttaant`

**Collections**:
- `newscards` - Ingested news articles
  - Unique index: `(url, language)`
  - Fields: title, summary, url, imageUrl, source, language, publishedAt, scrapedAt, rawMetadata

**Users** (future):
- `users` - User accounts
- `preferences` - User settings
- `saved_cards` - User bookmarks

## Backup & Restore

### Automated Backup (Recommended)

```bash
cd backend
npm run infra:backup
```

This creates a compressed archive in `backups/mongodb/` plus:

1. `.sha256` checksum file
2. `.meta` metadata file
3. Retention pruning (default keeps last 14 archives)

### Automated Restore (Recommended)

```bash
cd backend

# Validate latest archive only
npm run infra:restore -- --latest --dry-run

# Restore latest archive
npm run infra:restore -- --latest --drop

# Restore explicit archive
npm run infra:restore -- --backup-file ../backups/mongodb/vruttaant_YYYYMMDD_HHMMSS.archive.gz --drop
```

### Restore Drill Verification

```bash
cd backend
npm run infra:backup:verify
```

This command seeds a verification DB, backs it up, restores it, and checks deterministic marker parity.

### Manual Backup
```bash
docker exec vruttaant-mongodb mongodump --username admin --password admin123 --authenticationDatabase admin --out /backup
docker cp vruttaant-mongodb:/backup ./backup_$(date +%s)
```

### Restore from Backup
```bash
docker cp ./backup vruttaant-mongodb:/backup
docker exec vruttaant-mongodb mongorestore --username admin --password admin123 --authenticationDatabase admin /backup
```

## Scaling

### Local Development
Single MongoDB instance (current setup) is sufficient.

### Production
Switch to MongoDB Atlas (cloud-hosted):
1. Create cluster at mongodb.com
2. Update `MONGODB_URI` in backend/.env
3. Update firewall rules to allow your IP

## Performance Tuning

### For Development
Current defaults are fine.

### For Production
Consider:
- Connection pooling (Mongoose defaults to 5)
- Index optimization
- Sharding strategy
- Backup frequency

## Troubleshooting

### MongoDB Connection Refused
```bash
docker compose logs mongodb
```
Check if container started successfully.

### Port Already in Use
If port 27017 is occupied:
```bash
lsof -i :27017
kill -9 <PID>
```

Or modify `docker-compose.yml`:
```yaml
ports:
  - "27018:27017"  # Use 27018 on host
```

### Mongo Express Won't Load
Ensure MongoDB is healthy first:
```bash
docker compose logs mongodb
```

### Data Not Persisting
Verify volume exists:
```bash
docker volume ls | grep vruttaant
```

If missing, data was lost. Restore from backup if available.

## Docker Desktop Requirements

- Docker Desktop 20.10+
- 2GB RAM minimum
- 5GB free disk space (includes MongoDB image + data volume)

## Next Steps
- Run [SETUP.md](./SETUP.md) quick start guide
- Check [BACKEND.md](./BACKEND.md) for connection details
