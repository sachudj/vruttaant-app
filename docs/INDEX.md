# 📚 Documentation Index

Welcome to Vruttaant. This guide will help you navigate all available documentation.

## 🚀 Getting Started

**New to the project?**

1. Start here: [SETUP.md](./SETUP.md) - 5-minute quick start
2. Then read: [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the system design
3. Daily work: [DEVELOPMENT.md](./DEVELOPMENT.md) - Workflow & common tasks

## 📖 Complete Documentation

### Foundation (Read First)
- **[DEPENDENCIES.md](./DEPENDENCIES.md)** - ⭐ Start here! OS-specific setup (macOS/Linux/Windows)
- **[SETUP.md](./SETUP.md)** - Installation, running services, verification
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, project structure, tech stack
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - What's implemented, roadmap, next steps
- **[ROADMAP.md](./ROADMAP.md)** - Small-step implementation plan and security hardening checklist

### Development Guides
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Daily workflow, debugging, common tasks
- **[BACKEND.md](./BACKEND.md)** - Server setup, configuration, modules
- **[MOBILE_APP.md](./MOBILE_APP.md)** - Native Android setup, running, building
- **[USER_APP_GUIDE.md](./USER_APP_GUIDE.md)** - User-facing app journeys, expected pages, and scenarios

### Reference Documentation
- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Complete API reference with examples
- **[Vruttaant.postman_collection.json](./Vruttaant.postman_collection.json)** - Importable Postman collection for end-to-end API testing
- **[DATABASE.md](./DATABASE.md)** - MongoDB schema, queries, backup/restore
- **[DOCKER.md](./DOCKER.md)** - Container management, troubleshooting
- **[LOAD_TESTING.md](./LOAD_TESTING.md)** - Baseline performance testing and SLO targets
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Environment profiles, rollout steps, rollback playbook, and CI deployment gate
- **[SOCIAL_AUTH_PLAN.md](./SOCIAL_AUTH_PLAN.md)** - Planned implementation and documentation checklist for Google/Apple sign-in

## 🎯 Quick Navigation by Role

### 🔧 Backend Developer
1. [DEPENDENCIES.md](./DEPENDENCIES.md) - Set up your OS environment
2. [SETUP.md](./SETUP.md) - Get everything running
3. [BACKEND.md](./BACKEND.md) - Understand the server structure
4. [API_ENDPOINTS.md](./API_ENDPOINTS.md) - API reference
5. [DATABASE.md](./DATABASE.md) - Data models and queries
6. [DEVELOPMENT.md](./DEVELOPMENT.md) - Workflow and debugging

### 📱 Mobile Developer
1. [DEPENDENCIES.md](./DEPENDENCIES.md) - Set up your OS environment
2. [SETUP.md](./SETUP.md) - Get backend running
3. [MOBILE_APP.md](./MOBILE_APP.md) - Native Android setup and building
4. [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Backend API to consume
5. [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow

### 🏗️ DevOps/Infrastructure
1. [DEPENDENCIES.md](./DEPENDENCIES.md) - Set up your OS environment
2. [DOCKER.md](./DOCKER.md) - Container and service management
3. [DATABASE.md](./DATABASE.md) - Database operations and backup
4. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design

### 📊 Project Manager
1. [PROJECT_STATUS.md](./PROJECT_STATUS.md) - What's done, roadmap
2. [ROADMAP.md](./ROADMAP.md) - Pending tasks broken into actionable steps
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview

## 📋 File Descriptions

| File | Purpose | Audience |
|------|---------|----------|
| **DEPENDENCIES.md** | ⭐ OS-specific setup & all dependencies | Everyone first! |
| **SETUP.md** | Installation & quick start (5 min) | Everyone |
| **ARCHITECTURE.md** | System design & structure | Architects, leads |
| **PROJECT_STATUS.md** | Implementation summary & roadmap | Everyone |
| **ROADMAP.md** | Step-by-step pending implementation checklist | Everyone |
| **DEVELOPMENT.md** | Daily workflow & debugging | Developers |
| **BACKEND.md** | Server configuration & modules | Backend developers |
| **MOBILE_APP.md** | Native Android setup & building | Mobile developers |
| **USER_APP_GUIDE.md** | User journeys, pages, and scenarios | Product, QA, design |
| **API_ENDPOINTS.md** | Complete API reference | Developers, testers |
| **Vruttaant.postman_collection.json** | Postman API test collection | QA, developers |
| **DATABASE.md** | MongoDB schema & operations | Backend, DevOps |
| **DOCKER.md** | Container management | DevOps, backend |
| **LOAD_TESTING.md** | Baseline performance tests and SLOs | Backend, DevOps |
| **DEPLOYMENT.md** | Deployment profiles, rollout and rollback runbook | DevOps, backend, release managers |
| **SOCIAL_AUTH_PLAN.md** | Social auth implementation phases and doc parity checklist | Backend, mobile, PM |

## 🚦 Common Tasks

### I want to...

**...set up my development environment**
→ [DEPENDENCIES.md](./DEPENDENCIES.md) - Choose your OS (macOS/Linux/Windows)

**...start the project**
→ [SETUP.md](./SETUP.md)

**...understand the system**
→ [ARCHITECTURE.md](./ARCHITECTURE.md)

**...add a new API endpoint**
→ [DEVELOPMENT.md](./DEVELOPMENT.md) → Common Tasks section

**...inspect the database**
→ [DATABASE.md](./DATABASE.md) or [DOCKER.md](./DOCKER.md)

**...run the mobile app**
→ [MOBILE_APP.md](./MOBILE_APP.md)

**...fix a problem**
→ [DEVELOPMENT.md](./DEVELOPMENT.md) → Troubleshooting section

**...see all API endpoints**
→ [API_ENDPOINTS.md](./API_ENDPOINTS.md)

**...import APIs into Postman quickly**
→ [Vruttaant.postman_collection.json](./Vruttaant.postman_collection.json)

**...understand the database schema**
→ [DATABASE.md](./DATABASE.md)

**...learn the daily workflow**
→ [DEVELOPMENT.md](./DEVELOPMENT.md)

**...manage Docker services**
→ [DOCKER.md](./DOCKER.md)

## 🔗 External Links

### Official Documentation
- [Express.js](https://expressjs.com/)
- [MongoDB](https://docs.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [Android Developer](https://developer.android.com/)
- [Kotlin](https://kotlinlang.org/docs/home.html)
- [Docker](https://docs.docker.com/)

### Tools We Use
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Mongo Express](https://github.com/mongo-express/mongo-express) - MongoDB UI
- [dotenv](https://github.com/motdotla/dotenv) - Environment config

## 📝 Document Maintenance

- Last updated: **May 24, 2026**
- Total documentation: **20 top-level docs/items in `/docs`**
- Coverage: Tracks A-N are complete; social auth planning doc added for next phase execution

## ✅ Verification

All documentation is tested and verified:
- ✅ DEPENDENCIES.md - OS-specific setup tested on macOS, Linux, Windows
- ✅ SETUP.md - Installation tested and working
- ✅ ARCHITECTURE.md - System design validated
- ✅ BACKEND.md - Server running successfully
- ✅ API_ENDPOINTS.md - Endpoints tested with curl
- ✅ DATABASE.md - MongoDB connected and data persisting
- ✅ DOCKER.md - Containers running and healthy
- ✅ MOBILE_APP.md - Native Android environment verified
- ✅ DEVELOPMENT.md - Workflow tested

## 💡 Tips

1. **Keep docs updated** - Update relevant doc when making code changes
2. **Use Ctrl+F** - Each doc is searchable, use find for quick navigation
3. **Follow the hierarchy** - Start with SETUP, then branch into specific areas
4. **Check PROJECT_STATUS.md** - Keep it updated with new features/changes
5. **Reference API_ENDPOINTS.md** - When adding new endpoints

## 🆘 Need Help?

1. Check [DEVELOPMENT.md](./DEVELOPMENT.md) troubleshooting section
2. Search relevant documentation file (Ctrl+F)
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system understanding
4. Check [PROJECT_STATUS.md](./PROJECT_STATUS.md) for known limitations

---

**🎯 WHERE TO START:**

**New to the project?** → [DEPENDENCIES.md](./DEPENDENCIES.md) (set up OS environment)

**Want quick start?** → [SETUP.md](./SETUP.md)

**Want to understand architecture?** → [ARCHITECTURE.md](./ARCHITECTURE.md)

**Ready to develop?** → [DEVELOPMENT.md](./DEVELOPMENT.md)
