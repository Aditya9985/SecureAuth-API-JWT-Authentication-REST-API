# 🚀 SecureAuth API - Quick Start Guide

## One-Command Startup

### Development (Neon Local)
```bash
./dev.sh
```

### Production (Neon Cloud)
```bash
./prod.sh
```

That's it! The scripts handle:
- ✅ Checking Docker installation
- ✅ Validating environment files
- ✅ Building Docker images
- ✅ Starting containers
- ✅ Waiting for services to be healthy
- ✅ Running database migrations
- ✅ Streaming logs

---

## What These Scripts Do

### `dev.sh` - Development Environment
1. **Validates setup** — checks `.env.development`, Docker, and dependencies
2. **Creates directories** — sets up `.neon_local/` for local data
3. **Starts containers** — runs Neon Local and API with hot-reload
4. **Waits for health** — ensures database and API are responsive
5. **Applies migrations** — runs `npm run db:migrate`
6. **Streams logs** — shows real-time output from the app

**Result:** Development server running at `http://localhost:3000` with hot-reload enabled.

### `prod.sh` - Production Environment
1. **Validates setup** — checks `.env.production` and security requirements
2. **Builds image** — creates optimized Docker image
3. **Starts container** — runs API in production mode
4. **Verifies health** — ensures service is responding
5. **Shows status** — displays running container info

**Result:** Production server running at `http://localhost:3000` (or your deployment host).

---

## Prerequisites

### Required
- **Docker** & **Docker Compose** (v2.0+)
- **Node.js** ≥ 24.5.0 (for local development without Docker)
- **npm** (comes with Node)

### Files to Prepare
- **Development:** `.env.development` with Neon credentials
- **Production:** `.env.production` with Neon Cloud URL and secrets

---

## Development Workflow

### First Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Create .env.development (copy from .env.example)
cp .env.example .env.development
# Then edit with your Neon Local credentials

# 3. Run the dev script
./dev.sh
```

### Daily Development
```bash
# Just run the script
./dev.sh
```

Your code changes auto-reload instantly. No need to restart containers.

### Database Operations
While `dev.sh` is running in another terminal:

```bash
# Run migrations
docker compose -f docker-compose.dev.yml exec app npm run db:migrate

# Seed database
docker compose -f docker-compose.dev.yml exec app npm run db:seed

# Access database shell
docker compose -f docker-compose.dev.yml exec neon-local psql -U postgres
```

### View Logs
```bash
# App logs
docker compose -f docker-compose.dev.yml logs -f app

# Database logs
docker compose -f docker-compose.dev.yml logs -f neon-local

# All logs
docker compose -f docker-compose.dev.yml logs -f
```

### Stop Development
```bash
# Option 1: Press Ctrl+C in the terminal running dev.sh
# Option 2: In another terminal
docker compose -f docker-compose.dev.yml down

# Remove all data (reset database)
docker compose -f docker-compose.dev.yml down -v
```

---

## Production Deployment

### First Time Setup
```bash
# 1. Create .env.production with Neon Cloud URL
cp .env.example .env.production
# Then edit with your Neon Cloud credentials:
# - DB_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
# - JWT_SECRET=your-strong-secret-key-32-chars-min
# - ARCJET_KEY=ajkey_...

# 2. Run the prod script
./prod.sh
```

### Redeploy
```bash
./prod.sh
```

### Monitor Production
```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# View container stats (CPU, memory)
docker stats secureauth-api-prod

# Check health
curl http://localhost:3000/health
```

### Stop Production
```bash
docker compose -f docker-compose.prod.yml down
```

---

## Environment Files Reference

### `.env.development`
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Neon Local (inside Docker)
DB_URL=postgresql://postgres:password@neon-local:5432/postgres

# Security (dev keys, not for production)
JWT_SECRET=dev-secret-key-not-for-production
ARCJET_KEY=ajkey_dev_key_optional

# Neon credentials
NEON_API_KEY=napi_...
NEON_PROJECT_ID=withered-river-36050715
NEON_BRANCH_ID=main
```

### `.env.production`
```env
PORT=3000
NODE_ENV=production
LOG_LEVEL=warn

# Neon Cloud
DB_URL=postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/dbname?sslmode=require

# Security (strong keys only)
JWT_SECRET=your-production-secret-key-min-32-chars
ARCJET_KEY=ajkey_production
```

**⚠️ Never commit `.env.production` to git!**

---

## Troubleshooting

### Docker not running
```
❌ Error: Docker is not running!
```
**Solution:** Start Docker Desktop or the Docker daemon.

### Port already in use
```
ERROR: bind: address already in use
```
**Solution:** Change the port in your `.env` file:
```env
PORT=3001  # Use a different port
```

### Database connection failed
```
Error connecting to database: ECONNREFUSED
```
**Dev:**
```bash
# Check if neon-local is running
docker compose -f docker-compose.dev.yml ps

# Check database logs
docker compose -f docker-compose.dev.yml logs neon-local
```

**Prod:**
```bash
# Verify DB_URL is correct
cat .env.production | grep DB_URL

# Test connection from host
psql $DB_URL -c "SELECT version();"
```

### API won't start
```
Error: Cannot find module 'express'
```
**Solution:** Install dependencies inside the container:
```bash
docker compose -f docker-compose.dev.yml exec app npm install
```

### Out of disk space
```bash
# Remove unused containers and images
docker system prune -a --volumes
```

### Permission denied when running scripts
```bash
chmod +x dev.sh prod.sh
```

---

## API Testing

Once the server is running:

### Health Check
```bash
curl http://localhost:3000/health
```

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secure-password",
    "role": "user"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure-password"
  }'
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout
```

---

## Next Steps

1. **Read the docs:**
   - [README.md](README.md) — full project documentation
   - [DOCKER_SETUP.md](DOCKER_SETUP.md) — Docker details
   - [API Endpoints](README.md#api-endpoints) — endpoint reference

2. **Customize:**
   - Update user schema in `src/models/user.model.js`
   - Add protected routes in `src/routes/`
   - Implement custom business logic

3. **Deploy:**
   - Push Docker image to registry
   - Deploy to Kubernetes, ECS, or other platforms
   - See [README.md#deployment-platforms](README.md#deployment-platforms)

---

## Need Help?

- **Documentation:** See [README.md](README.md)
- **Docker issues:** See [DOCKER_SETUP.md](DOCKER_SETUP.md#troubleshooting)
- **Code errors:** Check `docker compose -f docker-compose.dev.yml logs app`
- **Database issues:** Check `docker compose -f docker-compose.dev.yml logs neon-local`
