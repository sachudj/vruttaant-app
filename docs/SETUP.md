# Project Setup & Quick Start

## Prerequisites
- Node.js 25.9.0+
- npm 11.12.1+
- Android Studio & Android SDK 36+
- JDK 17+
- Docker 20.10+ (for MongoDB)
- macOS 26.4.1+ (ARM64 Apple Silicon)

## Installation & Running (5 minutes)

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
```

### 2. Start MongoDB (Docker)
```bash
npm run infra:up
```

### 3. Start Backend Server
```bash
npm start
```
Backend will run on `http://localhost:5000` (or next free port if 5000 is occupied).

### 4. Mobile App Setup (Optional)
```bash
cd mobile_app
./gradlew installDebug   # Compiles and installs the debug app on connected device/emulator
```

## Verification

### Backend Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "vruttaant-backend",
  "databaseConnected": true,
  "timestamp": "2026-05-05T10:43:08.506Z"
}
```

### MongoDB UI (Optional)
Access Mongo Express at `http://localhost:8081`
- Username: `admin`
- Password: `admin123`

## Next Steps
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [BACKEND.md](./BACKEND.md) for API details
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for dev workflow
- Review [API_ENDPOINTS.md](./API_ENDPOINTS.md) for endpoints

## Stopping Services
```bash
cd backend
npm run infra:down
```

## Common Issues
1. **Port 5000 already in use**: Backend auto-switches to next free port (5001, 5002...)
2. **MongoDB connection refused**: Ensure `npm run infra:up` completed successfully
3. **MONGODB_URI not set**: Copy `.env.example` to `.env` in backend folder
