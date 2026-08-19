# SecureAuth API — JWT Authentication REST API

**SecureAuth API** is a production-grade **JWT Authentication REST API** built with **Node.js, Express, PostgreSQL, and Drizzle ORM** — featuring secure cookie-based sessions, input validation, and structured logging.

## Problem It Solves

Most full-stack apps bolt on authentication as an afterthought, ending up with weak passwords, unvalidated input, insecure token storage, and no observability. **SecureAuth API** solves that by providing a clean, production-ready authentication backend that handles:

- **Secure user registration & login** — passwords are never stored in plain text (hashed with `bcrypt`, 10 salt rounds).
- **Session management** — stateless JWT tokens issued after login, stored in **httpOnly, sameSite=strict** cookies to prevent XSS token theft.
- **Input integrity** — all request payloads validated with `zod` schemas before reaching business logic, returning structured 400 errors.
- **Role-based user model** — schema supports `user`/`admin` roles from day one, ready for RBAC authorization.
- **Observability** — every request and error is captured by Winston structured JSON logging (rotated to `combined.log` / `error.log`) and morgan request logging.
- **Security hardening** — Helmet HTTP headers, CORS, cookie-parser, and centralized error propagation.

The result is a reusable, layer-separated auth service you can drop into any frontend (React, Next.js, mobile apps, etc.) and build features on top of.

## Tech Stack

| Layer      | Technology                            | Purpose                                          |
| ---------- | ------------------------------------- | ------------------------------------------------ |
| Runtime    | Node.js (ES Modules)                  | JavaScript runtime                               |
| Framework  | Express 5                             | HTTP server & routing                            |
| Database   | PostgreSQL (Neon Serverless)          | Relational persistence (serverless-hosted)       |
| ORM        | Drizzle ORM + drizzle-kit             | Type-safe schema & SQL query builder             |
| Validation | Zod                                   | Runtime input schema validation                  |
| Auth       | jsonwebtoken + bcrypt + cookie-parser | JWT issuance, password hashing, cookies          |
| Logging    | Winston + Morgan                      | Structured logs + HTTP request logging           |
| Security   | Helmet + CORS                         | HTTP headers & cross-origin policy               |
| Security   | @arcjet/node                          | Rate limiting, bot detection & Shield (SQLi/XSS) |
| Config     | dotenv                                | Environment variable management                  |
| Tooling    | ESLint + Prettier                     | Code quality & formatting                        |

## Project Structure

Clean **layered architecture** (`Routes → Controllers → Services → Models`), keeping separation of concerns and making the codebase easy to extend:

```
src/
├── index.js                     # Entry point: loads dotenv, boots server
├── server.js                    # Creates HTTP server, listens on PORT
├── app.js                       # Express app: middleware stack + route mounting
├── config/
│   ├── arcjet.js                 # Arcjet client: shield + bot detection + rate-limit rules
│   ├── database.js                # Neon + Drizzle DB client (db, sql)
│   └── logger.js                 # Winston logger (JSON file + console)
├── models/
│   └── user.model.js            # Drizzle table schema: users
├── middlewares/
│   ├── security.middleware.js   # Arcjet protect() gate, runs before all routes
│   └── authenticate.middleware.js # JWT verification → req.user (own-account / RBAC checks)
├── routes/
│   ├── auth.routes.js            # /api/auth/* route definitions
│   └── users.route.js           # /api/users/* CRUD routes
├── controllers/
│   ├── auth.controller.js       # Request/response handlers, validation, cookies
│   └── users.controller.js      # User CRUD handlers + own-account/admin checks
├── services/
│   ├── auth.service.js          # Business logic: hashing, DB queries
│   └── user.service.js          # User CRUD queries (get/update/delete)
├── validations/
│   ├── auth.validations.js      # Zod schemas for register & login
│   └── users.validation.js      # Zod schemas for user ID & update payloads
└── utils/
    ├── jwt.js                   # JWT sign/verify wrapper
    ├── cookies.js               # httpOnly cookie set/get/clear helpers
    └── format.js                # Zod error formatter
```

### Request Lifecycle (what is called when)

```
Client
  │  POST /api/auth/register
  ▼
express.json() → cookieParser() → cors() → helmet() → morgan(log)
  ▼
securityMiddleware — aj.protect(req)   ← Shield (SQLi/XSS) + bot detection + rate limit (429/403)
  ▼
auth.route.js (router.post('/register', signup))
  ▼
auth.controller.js  signup()
  │ 1. registerSchema.safeParse(req.body)   ← Zod validation
  │ 2. createUser({...})                     ← service call
  ▼
auth.service.js  createUser()
  │ 1. DB lookup by email → "User already exists" guard
  │ 2. bcrypt.hash(password, 10)
  │ 3. db.insert(users) ... .returning()
  ▼
auth.controller.js
  │ 3. jwttoken.sign({ id, email, role })    ← JWT issued
  │ 4. cookies.set(res, 'token', token)      ← httpOnly cookie
  │ 5. res.status(201).json({ message, user })
  ▼
Client receives token cookie + user payload
```

The same flow applies to **login** (`authenticateUser`: look up by email → `bcrypt.compare` → issue JWT → set cookie) and **logout** (`clearCookie`).

## API Endpoints

| Method | Endpoint             | Auth        | Request Body                          | Success Response                      | Description                                          |
| ------ | -------------------- | ----------- | ------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| POST   | `/api/auth/register` | Public      | `{ name, email, password, role? }`    | `201` + user + token cookie           | Create a new user account                            |
| POST   | `/api/auth/login`    | Public      | `{ email, password }`                 | `200` + user + token cookie           | Authenticate and start a session                     |
| POST   | `/api/auth/logout`   | Public      | —                                     | `200` + message                       | Clear the token cookie                               |
| GET    | `/api/users`         | JWT         | —                                     | `200` + users + count                 | List all users (no passwords)                        |
| GET    | `/api/users/:id`     | JWT         | —                                     | `200` + user                          | Get a single user by ID                              |
| PUT    | `/api/users/:id`     | JWT         | `{ name?, email?, password?, role? }` | `200` + updated user                  | Update own account (admin may update anyone & roles) |
| DELETE | `/api/users/:id`     | JWT + Admin | —                                     | `200` + message                       | Delete a user (admin only)                           |
| GET    | `/health`            | Public      | —                                     | `200` `{ status, timestamp, uptime }` | Health/liveness check                                |
| GET    | `/api`               | Public      | —                                     | `200` `{ message }`                   | API root ping                                        |

> **Access rules** — every `/api/users/*` endpoint requires a valid JWT (`authenticate` middleware, verified from the `token` cookie or `Bearer` header):
>
> - `GET` — any authenticated user can fetch users.
> - `PUT /api/users/:id` — users can update **only their own** account (`403` otherwise); only **`admin`** users can change the `role` of any user.
> - `DELETE /api/users/:id` — **admin only** (`requireRole('admin')`).

### Error Handling

| Scenario                | Status | Response                                                                |
| ----------------------- | ------ | ----------------------------------------------------------------------- |
| Validation failed       | 400    | `{ error, details }` (formatted by Zod)                                 |
| Email already taken     | 409    | `{ message: "User already exists" }`                                    |
| Account not found       | 404    | `{ message: "User not found" }`                                         |
| Wrong password          | 401    | `{ message: "Invalid credentials" }`                                    |
| Missing/invalid token   | 401    | `{ message: "Authentication required" }` / `"Invalid or expired token"` |
| Permission denied       | 403    | `{ message: "You can only update your own account" }`                   |
| Role change forbidden   | 403    | `{ message: "Only admins can change the role of a user" }`              |
| Admin route forbidden   | 403    | `{ message: "Forbidden: admin access required" }`                       |
| Bot / attack detected   | 403    | `{ error: "Forbidden" }`                                                |
| Rate limit exceeded     | 429    | `{ error, message, retryAfter }`                                        |
| Unexpected server error | 500    | passed to Express error middleware                                      |

## Security Features

- **bcrypt** password hashing (10 rounds) — plaintext never persisted.
- **JWT** stateless session tokens signed with a server secret (`JWT_SECRET`), 1-day expiry.
- **httpOnly + sameSite=strict + secure** cookies — token not readable by client-side JS, mitigating XSS.
- **Helmet** sets security HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.).
- **Zod** schema validation on every input path — no unvalidated data reaches the DB.
- **Arcjet** request-protection pipeline (`aj.protect()` before every route) with:
  - `shield` — blocks SQL injection, XSS, and common attack payloads.
  - `detectBot` — denies automated/bot traffic (allows search engines & link previews).
  - `slidingWindow` — IP-based rate limiting (5 requests / 2s), returning `429 + Retry-After`.
- **Duplicate-email guard** at the service layer, in addition to the DB `UNIQUE` constraint.
- **CORS** middleware for controlled cross-origin access.

## Getting Started

### Prerequisites

- Node.js ≥ 24.5.0 (required by `@arcjet/node` — Node 20 is end-of-life)
- A Neon (or any PostgreSQL) database URL
- An Arcjet site key (free at https://app.arcjet.com)

### Installation

```bash
npm install
cp .env.example .env   # then fill in your values
```

`.env` variables:

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DB_URL=postgresql://...          # Neon / PostgreSQL connection string
JWT_SECRET=your-super-secret     # used to sign JWT tokens
ARCJET_KEY=ajkey_...             # Arcjet site key (rate limiting / bot protection)
```

### Database Setup

```bash
npm run db:generate   # generate migration SQL from schema
npm run db:migrate    # apply migrations to the database
npm run db:studio     # open Drizzle Studio UI
```

### Run

```bash
npm run dev     # start dev server with auto-reload (node --watch)
```

Server starts at `http://localhost:3000` (or `$PORT`).

## Available Scripts

| Script                 | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `npm run start`        | Start server (production)                       |
| `npm run dev`          | Start server with hot reload                    |
| `npm test`             | Run tests with Jest (ESM, VM modules, coverage) |
| `npm run lint`         | Run ESLint                                      |
| `npm run lint:fix`     | Auto-fix lint issues                            |
| `npm run format`       | Format code with Prettier                       |
| `npm run format:check` | Check formatting                                |
| `npm run db:generate`  | Generate Drizzle migrations                     |
| `npm run db:migrate`   | Apply migrations                                |
| `npm run db:studio`    | Open Drizzle Studio                             |
| `npm run dev:docker`   | Run dev container (hot reload)                  |
| `npm run prod:docker`  | Run production container                        |

## Testing

The project uses **[Jest](https://jestjs.io)** with native ESM support (`--experimental-vm-modules`) and coverage reporting:

```bash
npm test
```

- Runs via `jest.config.mjs`; covers the Express app, middleware, and utilities.
- Emits a `coverage/` report (gitignored after each run).
- Requires `NODE_ENV=test` and a `DATABASE_URL`/`DB_URL` when tests hit the database.

## CI/CD — GitHub Actions

Three automated pipelines live in `.github/workflows/`:

| Workflow                    | Trigger                                      | What it does                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint-and-format.yml`       | Push / PR to `main` or `staging`             | Node 20 + `npm ci`; runs `npm run lint` and `npm run format:check`; fails the job and annotates issues with fix suggestions (`npm run lint:fix` / `npm run format`).                                           |
| `tests.yml`                 | Push / PR to `main` or `staging`             | Node 20 + `npm ci`; runs `npm test` with `NODE_ENV=test`, `NODE_OPTIONS=--experimental-vm-modules`, and `DATABASE_URL`; uploads coverage artifacts (30-day retention) and writes a test/coverage step summary. |
| `docker-build-and-push.yml` | Push to `main` or manual `workflow_dispatch` | Docker Buildx multi-platform build (`linux/amd64`, `linux/arm64`); logs into Docker Hub; metadata tags (branch, SHA, `latest`, `prod-YYYYMMDD-HHmmss`); GHA layer caching; publishes image + summary.          |

**Required repository secrets** (Settings → Secrets and variables → Actions):

- `DOCKER_USERNAME`, `DOCKER_PASSWORD` — Docker Hub credentials for the build/push workflow.
- `DATABASE_URL` — used by `tests.yml` for test runs.

## Docker & Containerization

The application supports containerized deployments for both **local development** (with Neon Local) and **production** (with Neon Cloud). This ensures consistency across environments and simplifies deployment.

### Architecture Overview

```mermaid
graph LR
    A["Developer<br/>Local Machine"]
    B["Docker Compose Dev<br/>docker-compose.dev.yml"]
    C["Neon Local<br/>PostgreSQL in Container"]
    D["SecureAuth API<br/>Docker Container"]

    E["Docker Registry<br/>or Kubernetes"]
    F["Docker Compose Prod<br/>docker-compose.prod.yml"]
    G["Neon Cloud<br/>PostgreSQL as a Service"]
    H["SecureAuth API<br/>Production Container"]

    A -->|npm start| B
    B --> C
    B --> D
    C <-->|connects| D

    E -->|pull image| F
    F --> H
    G <-->|connects| H

    style B fill:#e1f5ff
    style C fill:#c8e6c9
    style D fill:#fff9c4
    style F fill:#ffccbc
    style G fill:#ffccbc
    style H fill:#fff9c4
```

### Development Setup (Local with Neon Local)

Use `docker-compose.dev.yml` for local development. This runs both Neon Local (PostgreSQL) and the API in separate containers, with hot-reload enabled.

#### Prerequisites

- Docker & Docker Compose installed
- Port `3000` (API) and `5432` (PostgreSQL) available

#### Start Development Environment

```bash
docker-compose -f docker-compose.dev.yml up --build
```

This command:

1. Builds the Docker image for the API
2. Starts Neon Local container (PostgreSQL)
3. Starts the API container with `npm run dev` (hot reload enabled)
4. Waits for PostgreSQL to be healthy before starting the API
5. Mounts your source code for live changes

**Output:**

```
neon-local-db | PostgreSQL is running
secureauth-api-dev | Server is listening on port http://localhost:3000
```

#### Access Services

- **API**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/health`
- **PostgreSQL**: `localhost:5432` (from host) or `neon-local:5432` (inside Docker network)

#### Environment Variables (Development)

The `.env.development` file is automatically loaded:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DB_URL=postgresql://postgres:password@neon-local:5432/postgres
JWT_SECRET=dev-secret-key-not-for-production
ARCJET_KEY=ajkey_dev_key_optional
```

#### Database Operations in Docker

Run Drizzle commands inside the container:

```bash
# Generate migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:generate

# Apply migrations
docker-compose -f docker-compose.dev.yml exec app npm run db:migrate

# Open Drizzle Studio
docker-compose -f docker-compose.dev.yml exec app npm run db:studio
```

#### Clean Up

```bash
# Stop and remove containers
docker-compose -f docker-compose.dev.yml down

# Remove volumes (database data)
docker-compose -f docker-compose.dev.yml down -v
```

---

### Production Deployment (with Neon Cloud)

Use `docker-compose.prod.yml` for production deployments. This assumes an external Neon Cloud database and focuses on security and performance.

#### Prerequisites

- Docker & Docker Compose installed
- **Neon Cloud account** with a database URL (https://neon.tech)
- Environment variables set for production (see below)

#### Build Docker Image

```bash
docker build -t secureauth-api:latest .
```

Or use Docker Compose directly:

```bash
docker-compose -f docker-compose.prod.yml build
```

#### Start Production Environment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This command:

1. Pulls the pre-built Docker image (or builds it)
2. Starts the API container in detached mode (`-d`)
3. Uses environment variables from `.env.production` or system environment
4. Enables automatic restart and health checks
5. **Does NOT** mount source code (uses built image only)

**Output:**

```
secureauth-api-prod | Server is listening on port http://localhost:3000
```

#### Environment Variables (Production)

Create `.env.production` or export via your deployment platform:

```env
PORT=3000
NODE_ENV=production
LOG_LEVEL=warn
DB_URL=postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=your-production-secret-key-min-32-chars
ARCJET_KEY=ajkey_your_production_key
```

**Important Security Notes:**

- Never commit `.env.production` to git (already in `.gitignore`)
- Use strong, randomly-generated JWT secrets (≥32 characters)
- Set `NODE_ENV=production` to disable hot-reload and optimize logging
- Use `sslmode=require` for Neon Cloud connections

#### Access Services

- **API**: `http://localhost:3000` (or your deployed hostname)
- **Health Check**: `http://localhost:3000/health`

#### Monitoring & Logs

```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f app

# View container stats (CPU, memory)
docker stats secureauth-api-prod
```

#### Clean Up

```bash
# Stop containers
docker-compose -f docker-compose.prod.yml stop

# Remove stopped containers
docker-compose -f docker-compose.prod.yml down
```

---

### Dockerfile Explanation

The [Dockerfile](Dockerfile) uses a **multi-stage build** for optimization:

1. **Stage 1 (Builder)**: Installs dependencies in a temporary container
2. **Stage 2 (Runtime)**: Copies only production dependencies, not development tools
3. **Result**: Smaller image size (~200–300MB) and faster deployment

Key features:

- **Node 24 Alpine**: Slim base image (~150MB vs ~1GB for full Node)
- **Non-root user**: Runs as `nodejs` (uid 1001) for security
- **Health check**: Automatically monitors `/health` endpoint for orchestration
- **Production-optimized**: No hot-reload, no dev dependencies

### Environment-Specific Configurations

| Aspect               | Development (Neon Local)   | Production (Neon Cloud)    |
| -------------------- | -------------------------- | -------------------------- |
| **Database**         | `neon-local` (in Docker)   | Neon Cloud (external SaaS) |
| **Connection**       | `neon-local:5432`          | `ep-xxx.neon.tech:5432`    |
| **Data Persistence** | Docker volume (ephemeral)  | Managed by Neon            |
| **Node Env**         | `development`              | `production`               |
| **Hot Reload**       | ✅ Enabled (`npm run dev`) | ❌ Disabled (built image)  |
| **Log Level**        | `info` (verbose)           | `warn` (errors only)       |
| **Source Mounting**  | ✅ Yes (live code changes) | ❌ No (immutable image)    |
| **Restart Policy**   | No automatic restart       | Always restart on failure  |
| **Health Checks**    | Basic                      | Continuous monitoring      |

### Switching Between Environments

#### Local Development

```bash
docker-compose -f docker-compose.dev.yml up
```

#### Production Deployment (on server)

```bash
export DB_URL="postgresql://user:pw@ep-xxx.neon.tech/dbname?sslmode=require"
export JWT_SECRET="your-production-secret"
export ARCJET_KEY="ajkey_prod"

docker-compose -f docker-compose.prod.yml up -d
```

Or use a `.env.production` file (never commit to git):

```bash
docker-compose -f docker-compose.prod.yml up -d --env-file .env.production
```

---

### Deployment Platforms

#### Docker Hub / Docker Registry

```bash
# Build and tag for Docker Hub
docker build -t your-username/secureauth-api:latest .

# Push to registry
docker push your-username/secureauth-api:latest

# Pull and run on any machine
docker run -p 3000:3000 \
  -e DB_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  your-username/secureauth-api:latest
```

#### Kubernetes (K8s)

Deploy using the production Docker image with environment-based configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secureauth-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secureauth-api
  template:
    metadata:
      labels:
        app: secureauth-api
    spec:
      containers:
        - name: api
          image: your-username/secureauth-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: DB_URL
              valueFrom:
                secretKeyRef:
                  name: secureauth-secrets
                  key: database-url
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: secureauth-secrets
                  key: jwt-secret
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
```

#### AWS ECS / Fargate

```bash
# Create ECR repository
aws ecr create-repository --repository-name secureauth-api

# Build and push
docker build -t secureauth-api:latest .
docker tag secureauth-api:latest {aws-account-id}.dkr.ecr.{region}.amazonaws.com/secureauth-api:latest
docker push {aws-account-id}.dkr.ecr.{region}.amazonaws.com/secureauth-api:latest

# Configure ECS task definition with environment variables
```

---

## Roadmap / Next Steps

- Dedicated `/api/admin/*` RBAC middleware guarding privileged endpoints.
- Refresh-token rotation for longer-lived sessions.
- Password reset & email verification flows.
- Unit/integration tests (Vitest + Supertest).
- Frontend reference implementation (React/Next.js).
