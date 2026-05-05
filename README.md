# Vruttaant
A multilingual, card-based news app providing a concise "Vruttaant" (chronicle) of local events through a swipable interface.

**Status**: Early Development (v0.1)  
**Last Updated**: May 5, 2026

## Quick Start (5 minutes)

```bash
# 1. Start MongoDB
cd backend && npm run infra:up

# 2. Setup and start backend
cp .env.example .env
npm install
npm start

# 3. In another terminal, start mobile app
cd mobile_app
flutter pub get
flutter run
```

Backend running on: `http://localhost:5000` (or next free port)

## Project Structure

```
vruttaant-app/
├── backend/           # Node.js + Express API server
├── mobile_app/        # Flutter cross-platform app
├── docker-compose.yml # MongoDB + Mongo Express containers
├── docs/              # Complete documentation (START HERE)
└── README.md          # This file
```

## 📚 Documentation

**Start here:** [📖 Documentation Index](./docs/INDEX.md) - Complete navigation guide

**First-time Setup:**
→ [🔧 Environment & Dependencies](./docs/DEPENDENCIES.md) - OS-specific setup (macOS/Linux/Windows)

**Quick Links:**
1. [Setup Guide](./docs/SETUP.md) - Installation & 5-min quick start ⚡
2. [Architecture](./docs/ARCHITECTURE.md) - System design & structure 
3. [Development Guide](./docs/DEVELOPMENT.md) - Daily workflow & common tasks
4. [Project Status](./docs/PROJECT_STATUS.md) - What's done, roadmap, next steps

**API & Backend:**
- [API Endpoints](./docs/API_ENDPOINTS.md) - Complete reference with examples
- [Backend Guide](./docs/BACKEND.md) - Server setup & configuration
- [Database Schema](./docs/DATABASE.md) - MongoDB models & queries

**Infrastructure:**
- [Docker/MongoDB](./docs/DOCKER.md) - Container management & troubleshooting
- [Mobile App](./docs/MOBILE_APP.md) - Flutter setup & building

## Tech Stack

**Backend**: Node.js 25.9 + Express 4.21 + Mongoose 8.18 + Cheerio 1.0  
**Database**: MongoDB 7 (Docker)  
**Mobile**: Flutter 3.41 + Dart 3.11  
**Infrastructure**: Docker + Docker Compose  

## Key Features Implemented

✅ Backend API with Express  
✅ MongoDB with Docker  
✅ News web scraping (Cheerio)  
✅ Multilingual support structure  
✅ Environment-based configuration  
✅ Port auto-fallback (5000 → 5001 → ...)  
✅ Health check endpoints  
✅ Docker infrastructure scripts  
✅ Complete documentation  

## Next Phase (Roadmap)

- [ ] Flutter UI for card-based news feed
- [ ] API endpoint to retrieve saved news
- [ ] User authentication & profiles
- [ ] Bookmark/save articles feature
- [ ] Language preference settings
- [ ] Background news sync
- [ ] Push notifications
- [ ] Advanced search & filtering

## Infrastructure Scripts

From `backend/` directory:

```bash
npm run infra:up      # Start MongoDB
npm run infra:ps      # Check status
npm run infra:down    # Stop MongoDB
```

## Useful Links

- **Backend Health**: http://localhost:5000/health
- **Mongo Express UI**: http://localhost:8081
  - Username: `admin`
  - Password: `admin123`

## Troubleshooting

**Port already in use?**  
Backend auto-switches to next free port. Check terminal output.

**MongoDB connection failed?**  
Run `npm run infra:ps` to verify containers are running.

**Mobile app won't build?**  
```bash
cd mobile_app
flutter clean
flutter pub get
flutter run
```

For more help, see [DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Contributing

All documentation is in `docs/` folder. Update relevant doc when making changes.

## License

MIT License - See [LICENSE](./LICENSE) file
