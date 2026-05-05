# 📦 Dependencies & Environment Setup

Complete guide to setting up Vruttaant on macOS, Linux, or Windows.

## 🎯 Quick Overview

**Required:**
- Node.js 18+ with npm
- Git

**Recommended:**
- Docker & Docker Compose (for MongoDB)
- VS Code or preferred IDE

**For Mobile Development:**
- Flutter 3.40+ with Dart
- Android Studio / Xcode (for emulators)

---

## 📋 Complete Dependency List

### Backend Dependencies (npm)

| Package | Version | Purpose |
|---------|---------|---------|
| **express** | 4.21.2 | Web framework & HTTP server |
| **mongoose** | 8.18.0 | MongoDB object modeling |
| **cheerio** | 1.0.0 | HTML parsing for web scraping |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |
| **dotenv** | 17.4.2 | Environment variable loading |

### System Dependencies

| Tool | Min Version | Purpose |
|------|-------------|---------|
| **Node.js** | 18.0.0 | JavaScript runtime |
| **npm** | 9.0.0 | Package manager |
| **Git** | 2.30.0 | Version control |
| **Docker** | 20.10 | Container runtime (optional but recommended) |
| **Docker Compose** | 2.0 | Multi-container orchestration (optional) |

### Mobile Dependencies (Flutter)

| Component | Version | Purpose |
|-----------|---------|---------|
| **Flutter** | 3.40+ | Mobile framework |
| **Dart** | 3.10+ | Programming language |
| **http (pub package)** | ^1.2.2 | Backend API client in mobile app |
| **Android SDK** | API 24+ | Android development |
| **Xcode** | 14+ | iOS development (macOS only) |

### Database

| Software | Version | Deployment |
|----------|---------|-----------|
| **MongoDB** | 7.0 | Docker container or local install |

---

## 🍎 macOS Setup

### Prerequisites Check

First, verify what you already have:

```bash
# Check macOS version
sw_vers

# Check if Node.js is installed
node --version        # Should show v18+ (or later)
npm --version         # Should show 9+ (or later)

# Check if Git is installed
git --version
```

### Step 1: Install Node.js & npm

**Option A: Using Homebrew (Recommended)**

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm)
brew install node@20

# Verify installation
node --version          # Should show v20.x.x
npm --version           # Should show 10.x.x
```

**Option B: Using nvm (Node Version Manager)**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.zshrc         # or ~/.bashrc if using bash

# Install Node.js 20
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

**Option C: Direct Download**

Download from [nodejs.org](https://nodejs.org/) - Choose LTS version (18+)

### Step 2: Install Git (Usually Pre-installed)

```bash
# Check if Git is installed
git --version

# If not installed, use Homebrew
brew install git
```

### Step 3: Install Docker (Recommended)

```bash
# Install Docker Desktop for macOS
brew install --cask docker

# Or download directly from https://www.docker.com/products/docker-desktop

# Start Docker (or launch Docker Desktop from Applications)
open /Applications/Docker.app

# Verify installation (after Docker starts)
docker --version
docker compose version
```

### Step 4: Install Flutter (For Mobile Development)

```bash
# Install Flutter using Homebrew
brew install flutter

# Or download manually from https://flutter.dev/docs/get-started/install/macos

# Verify installation
flutter --version
dart --version

# Check Flutter setup
flutter doctor         # Shows missing components
```

### Step 5: Verify Everything

```bash
# Create a test script
cat > /tmp/verify_setup.sh << 'EOF'
#!/bin/bash
echo "🔍 Verifying Vruttaant Environment Setup..."
echo ""

echo "✓ Node.js:"
node --version
echo "✓ npm:"
npm --version
echo "✓ Git:"
git --version
echo "✓ Docker:"
docker --version
echo "✓ Docker Compose:"
docker compose version
echo "✓ Flutter:"
flutter --version
echo ""
echo "✅ All required tools are installed!"
EOF

chmod +x /tmp/verify_setup.sh
/tmp/verify_setup.sh
```

### macOS Installation Time

- Node.js via Homebrew: ~5 minutes
- Docker Desktop: ~10 minutes (first run)
- Flutter: ~15 minutes
- Total: ~30 minutes

---

## 🐧 Linux Setup (Ubuntu/Debian)

### Prerequisites Check

```bash
# Check Ubuntu version
lsb_release -a

# Check installed tools
node --version
npm --version
git --version
```

### Step 1: Install Node.js & npm

**Using NodeSource Repository (Recommended)**

```bash
# Update package list
sudo apt update

# Install curl if not present
sudo apt install -y curl

# Add NodeSource repository (Node 20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify
node --version          # v20.x.x
npm --version           # 10.x.x
```

**Alternative: Using nvm**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

### Step 2: Install Git

```bash
sudo apt update
sudo apt install -y git

# Verify
git --version
```

### Step 3: Install Docker

```bash
# Add Docker repository
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker compose version
```

### Step 4: Install Flutter (For Mobile Development)

```bash
# Install dependencies
sudo apt install -y git curl clang cmake ninja-build pkg-config libgtk-3-dev

# Download Flutter
cd ~
git clone https://github.com/flutter/flutter.git -b stable

# Add Flutter to PATH
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.bashrc
source ~/.bashrc

# Verify
flutter --version
flutter doctor         # Shows missing components
```

### Step 5: Verify Everything

```bash
# Create verification script
cat > ~/verify_setup.sh << 'EOF'
#!/bin/bash
echo "🔍 Verifying Vruttaant Environment Setup..."
echo ""

echo "✓ Node.js:"
node --version
echo "✓ npm:"
npm --version
echo "✓ Git:"
git --version
echo "✓ Docker:"
docker --version
echo "✓ Docker Compose:"
docker compose version
echo "✓ Flutter:"
flutter --version
echo ""
echo "✅ All required tools are installed!"
EOF

chmod +x ~/verify_setup.sh
~/verify_setup.sh
```

### Linux Installation Time

- Node.js: ~10 minutes
- Docker: ~15 minutes
- Flutter: ~20 minutes
- Total: ~45 minutes

---

## 🪟 Windows Setup

### Prerequisites Check

Open PowerShell (as Administrator):

```powershell
# Check Windows version
[System.Environment]::OSVersion.VersionString

# Check installed tools
node --version
npm --version
git --version
```

### Step 1: Install Node.js & npm

**Option A: Using Installer (Easiest)**

1. Download from [nodejs.org](https://nodejs.org/)
2. Choose "LTS" version (18+)
3. Run installer, follow prompts
4. Select "Add to PATH" during installation
5. Restart PowerShell

```powershell
# Verify
node --version          # v20.x.x
npm --version           # 10.x.x
```

**Option B: Using Chocolatey**

```powershell
# Install Chocolatey (if not already installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs -y

# Verify
node --version
npm --version
```

**Option C: Using Windows Package Manager (winget)**

```powershell
# Install Node.js
winget install OpenJS.NodeJS.LTS

# Verify
node --version
npm --version
```

### Step 2: Install Git

**Option A: Using Installer**

1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Run installer, accept defaults
3. Complete installation and restart PowerShell

```powershell
# Verify
git --version
```

**Option B: Using Chocolatey**

```powershell
choco install git -y

# Verify
git --version
```

### Step 3: Install Docker

```powershell
# Option A: Download Docker Desktop for Windows
# Go to https://www.docker.com/products/docker-desktop
# Run installer, follow prompts

# Option B: Using Chocolatey
choco install docker-desktop -y

# After installation, start Docker Desktop
# Then verify:
docker --version
docker compose version
```

**Important:** Docker Desktop on Windows requires:
- Windows 10/11 Pro/Enterprise/Education
- Hyper-V enabled (usually pre-installed)
- At least 4GB RAM allocated to Docker

### Step 4: Install Flutter (For Mobile Development)

```powershell
# Download Flutter
git clone https://github.com/flutter/flutter.git -b stable

# Add Flutter to PATH:
# 1. Right-click "This PC" → Properties
# 2. Click "Advanced system settings"
# 3. Click "Environment Variables"
# 4. Under "User variables", click "New"
# 5. Variable name: Path
#    Variable value: C:\path\to\flutter\bin
# 6. Click OK and restart PowerShell

# Verify
flutter --version
flutter doctor         # Shows missing components
```

### Step 5: Install Android Studio (For Mobile Emulator)

```powershell
# Download from https://developer.android.com/studio

# Run installer and follow prompts
# During setup, ensure:
# - Android SDK is installed
# - Android Emulator is installed
# - Add to PATH

# Verify
flutter doctor
```

### Step 6: Verify Everything

```powershell
# Create verification script
$script = @"
Write-Host "🔍 Verifying Vruttaant Environment Setup..." -ForegroundColor Cyan
Write-Host ""

Write-Host "✓ Node.js:" -ForegroundColor Green
node --version
Write-Host "✓ npm:" -ForegroundColor Green
npm --version
Write-Host "✓ Git:" -ForegroundColor Green
git --version
Write-Host "✓ Docker:" -ForegroundColor Green
docker --version
Write-Host "✓ Docker Compose:" -ForegroundColor Green
docker compose version
Write-Host "✓ Flutter:" -ForegroundColor Green
flutter --version
Write-Host ""
Write-Host "✅ All required tools are installed!" -ForegroundColor Green
"@

$script | Out-File -FilePath "$env:USERPROFILE\verify_setup.ps1"
& "$env:USERPROFILE\verify_setup.ps1"
```

### Windows Installation Time

- Node.js: ~5 minutes
- Git: ~5 minutes
- Docker Desktop: ~15 minutes (first run)
- Flutter: ~20 minutes
- Android Studio: ~30 minutes (optional)
- Total: ~45-75 minutes

---

## 🚀 After Installation: Get Vruttaant Running

### All Platforms

```bash
# 1. Clone or navigate to project
cd /path/to/vruttaant-app

# 2. Install backend dependencies
cd backend
npm install

# 3. Start Docker services (if using Docker for MongoDB)
npm run infra:up

# 4. Verify environment
npm run infra:ps        # Should show MongoDB container "Up" and "healthy"

# 5. Start backend server
npm start               # Server runs on http://localhost:5000 (or 5001)

# 6. In another terminal, test the API
curl http://localhost:5000/health
```

### For Mobile Development

```bash
# From project root
cd mobile_app

# Check Flutter setup
flutter doctor

# Install dependencies
flutter pub get

# Run on iOS simulator/device
flutter run --dart-define=API_BASE_URL=http://localhost:5000

# Run on Android emulator (host loopback mapping)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000
```

---

## ✅ Verification Checklist

Use this checklist to verify your setup:

### Backend

- [ ] Node.js version 18+: `node --version`
- [ ] npm version 9+: `npm --version`
- [ ] Git installed: `git --version`
- [ ] Backend dependencies installed: `cd backend && npm list`
- [ ] Server starts: `npm start` → Shows "listening on port 5000"
- [ ] Health endpoint responds: `curl http://localhost:5000/health`
- [ ] Docker running (if applicable): `docker ps`
- [ ] MongoDB container healthy: `npm run infra:ps`

### Mobile

- [ ] Flutter installed: `flutter --version`
- [ ] Dart installed: `dart --version`
- [ ] Flutter setup complete: `flutter doctor` → No errors
- [ ] Android SDK installed (for Android): `flutter doctor`
- [ ] Xcode installed (for iOS on macOS): `xcode-select --version`
- [ ] Emulator/device detected: `flutter devices`

---

## 🆘 Troubleshooting

### "command not found: npm"

**Solution:** npm not in PATH
```bash
# macOS/Linux
echo $PATH | grep node
# If empty, add to ~/.bashrc or ~/.zshrc:
export PATH="/usr/local/bin:$PATH"

# Windows
# Re-add Node.js to PATH through Environment Variables
```

### "npm install" fails

**Solution:** Clear npm cache
```bash
npm cache clean --force
npm install
```

### Docker won't start

**macOS/Windows:**
- Open Docker Desktop manually
- Wait for "Docker is running" notification

**Linux:**
```bash
# Start Docker daemon
sudo systemctl start docker

# Verify
docker ps
```

### MongoDB connection fails

**Solution:** Start MongoDB container
```bash
cd backend
npm run infra:up

# Verify
npm run infra:ps    # Should show mongodb "Up" and "healthy"
```

### "Port 5000 already in use"

**Solution:** Backend will auto-fallback to port 5001, or kill existing process
```bash
# macOS/Linux
lsof -i :5000       # Find process using port 5000
kill -9 <PID>       # Kill process

# Windows (PowerShell)
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Flutter doctor shows errors

**Solution:** Run doctor and follow suggestions
```bash
flutter doctor -v   # Verbose output with fixes
flutter doctor --android-licenses  # Accept Android licenses
```

---

## 📊 Quick Reference

### Installation Time by OS

| OS | Time | Notes |
|---|------|-------|
| **macOS** | 30 min | Homebrew makes it fastest |
| **Linux** | 45 min | Add repository keys, slightly longer |
| **Windows** | 45-75 min | Android Studio optional adds 30 min |

### System Requirements by OS

| OS | Min Disk | Min RAM | Notes |
|----|----------|---------|-------|
| **macOS** | 20 GB | 8 GB | Intel or Apple Silicon |
| **Linux** | 20 GB | 8 GB | Ubuntu 20.04+ recommended |
| **Windows** | 30 GB | 8 GB | Pro/Enterprise for Docker |

### Minimum vs Recommended

**Minimum Setup (Backend only):**
- Node.js 18+
- npm 9+
- Git
- Total disk: ~2 GB

**Recommended Setup (Full dev):**
- Node.js 20
- Docker & Compose
- Flutter
- Android Studio / Xcode
- Total disk: ~30-50 GB
- Total RAM: 8-16 GB

---

## 🔄 Updating Dependencies

### Update npm packages

```bash
# Check outdated packages
npm outdated

# Update to latest patch versions
npm update

# Update to latest major versions (be careful!)
npm install express@latest mongoose@latest
```

### Update Node.js

**macOS:**
```bash
brew upgrade node
```

**Linux (nvm):**
```bash
nvm install node
nvm use node
```

**Windows:**
Download latest from nodejs.org and run installer

### Update Docker

**All platforms:**
- Open Docker Desktop
- Check for updates
- Click "Install and Restart"

---

## 📚 Next Steps

After installation, proceed with:

1. **Getting Started:** [SETUP.md](./SETUP.md)
2. **Understanding Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Daily Development:** [DEVELOPMENT.md](./DEVELOPMENT.md)
4. **Backend Guide:** [BACKEND.md](./BACKEND.md)
5. **Mobile Setup:** [MOBILE_APP.md](./MOBILE_APP.md)

---

## 📞 Support Resources

- **Node.js Issues:** https://nodejs.org/en/docs/
- **npm Docs:** https://docs.npmjs.com/
- **Docker Issues:** https://docs.docker.com/
- **Flutter Issues:** https://flutter.dev/docs
- **Git Help:** https://git-scm.com/doc

---

**Last Updated:** May 5, 2026  
**Verified On:** macOS 14.4, Ubuntu 22.04, Windows 11  
**Node.js Version Used:** 20.11.0  
**npm Version Used:** 10.x.x
