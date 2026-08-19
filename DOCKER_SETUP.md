# Docker Setup Guide - SecureAuth API

Quick reference for running SecureAuth API in Docker for development and production.

## 🚀 Quick Start

### Development (Local with Neon Local)

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Then test the API:

```bash
curl http://localhost:3000/health
```

### Production (with Neon Cloud)

```bash
# Set environment variables
export DB_URL="postgresql://user:pw@ep-xxx.neon.tech/dbname?sslmode=require"
export JWT_SECRET="your-production-secret"
export ARCJET_KEY="ajkey_prod"

# Start
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📁 Files Overview

| File                      | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `Dockerfile`              | Multi-stage build for production image     |
| `docker-compose.dev.yml`  | Local dev with Neon Local + hot reload     |
| `docker-compose.prod.yml` | Production with Neon Cloud + health checks |
| `.env.example`            | Template for environment variables         |
| `.env.development`        | Dev config (Neon Local)                    |
| `.env.production`         | Prod config (Neon Cloud) — never commit    |
| `.dockerignore`           | Files to exclude from Docker build         |

---

## 🛠 Development Commands

### Start Development Stack

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Includes:

- Neon Local PostgreSQL container
- SecureAuth API with hot-reload
- Automatic database health checks

### Run Database Migrations

```bash
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate
```

### View API Logs

```bash
docker-compose -f docker-compose.dev.yml logs -f app
```

### Access PostgreSQL

```bash
# From host (requires psql installed)
psql postgresql://postgres:password@localhost:5432/postgres

# From inside container
docker-compose -f docker-compose.dev.yml exec neon-local psql -U postgres
```

### Stop & Clean Up

```bash
# Stop containers (keep data)
docker-compose -f docker-compose.dev.yml stop

# Remove containers and volumes (delete data)
docker-compose -f docker-compose.dev.yml down -v
```

---

## 🏭 Production Commands

### Build Docker Image

```bash
docker build -t secureauth-api:latest .
```

Or via Compose:

```bash
docker-compose -f docker-compose.prod.yml build
```

### Start Production Server

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Monitor Running Container

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f app

# Check container stats
docker stats secureauth-api-prod
```

### Stop Production Server

```bash
docker-compose -f docker-compose.prod.yml down
```

---

## 🔐 Environment Variables

### Development (Neon Local)

`.env.development`:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DB_URL=postgresql://postgres:password@neon-local:5432/postgres
JWT_SECRET=dev-secret-key
ARCJET_KEY=ajkey_dev
```

**Important**: This file IS committed to git (it's for local dev only).

### Production (Neon Cloud)

`.env.production`:

```env
PORT=3000
NODE_ENV=production
LOG_LEVEL=warn
DB_URL=postgresql://user:pw@ep-xxx.neon.tech/dbname?sslmode=require
JWT_SECRET=your-strong-secret-key-32-chars-min
ARCJET_KEY=ajkey_prod
```

**Important**: This file should NOT be committed to git. Set variables via:

- Environment variables
- Secret management (AWS Secrets Manager, etc.)
- CI/CD pipeline secrets

---

## 🐳 Docker Image Details

### Base Image

- **Node 24 Alpine**: ~150MB base, optimized for production
- **Multi-stage build**: Dev dependencies excluded from final image

### Final Image Size

- ~250–300MB (vs ~1GB for full Node image)

### Security

- Non-root user (`nodejs:1001`)
- No dev dependencies in production
- Health check enabled

---

## 🔄 Switching Environments

### Switch to Development

```bash
# Stop production
docker-compose -f docker-compose.prod.yml down

# Start development
docker-compose -f docker-compose.dev.yml up
```

### Switch to Production

```bash
# Stop development
docker-compose -f docker-compose.dev.yml down -v

# Start production
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🌐 Database Connection URLs

### Development (Neon Local)

From **host**: `postgresql://postgres:password@localhost:5432/postgres`

From **Docker container**: `postgresql://postgres:password@neon-local:5432/postgres`

### Production (Neon Cloud)

From **anywhere**: `postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/dbname?sslmode=require`

Get your URL from Neon dashboard: https://console.neon.tech

---

## 🚢 Deployment Platforms

### Docker Hub

```bash
docker build -t yourusername/secureauth-api:latest .
docker push yourusername/secureauth-api:latest
```

### Kubernetes

Deploy with:

```bash
kubectl apply -f k8s-deployment.yaml
```

### AWS ECS/Fargate

Push to ECR, then configure task definition with Neon database URL.

### Heroku (Traditional - no Docker)

```bash
git push heroku main
```

(Requires Procfile: `web: npm run start` or similar)

---

## ❓ Troubleshooting

### API won't start

```bash
# Check container logs
docker-compose -f docker-compose.dev.yml logs app

# Verify Neon Local is healthy
docker-compose -f docker-compose.dev.yml logs neon-local
```

### Can't connect to database

**Dev**:

```bash
# Check Neon Local is running
docker-compose -f docker-compose.dev.yml ps

# Verify from container
docker-compose -f docker-compose.dev.yml exec app psql postgresql://postgres:password@neon-local:5432/postgres
```

**Prod**:

```bash
# Verify DB_URL is correct
echo $DB_URL

# Test from container
docker run -it --rm postgres psql $DB_URL -c "SELECT version();"
```

### Port 3000 already in use

```bash
# Use a different port
docker-compose -f docker-compose.dev.yml up -e PORT=3001
```

### Out of disk space

```bash
# Remove unused images and volumes
docker system prune -a --volumes
```

---

## 📚 Further Reading

- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Neon Local Documentation](https://neon.com/docs/local/neon-local)
- [Neon Cloud Documentation](https://neon.tech/docs)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
