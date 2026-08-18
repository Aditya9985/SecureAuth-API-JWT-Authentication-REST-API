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

| Layer            | Technology                                  | Purpose                                  |
| ---------------- | ------------------------------------------- | ---------------------------------------- |
| Runtime          | Node.js (ES Modules)                        | JavaScript runtime                       |
| Framework        | Express 5                                   | HTTP server & routing                    |
| Database         | PostgreSQL (Neon Serverless)                | Relational persistence (serverless-hosted) |
| ORM              | Drizzle ORM + drizzle-kit                   | Type-safe schema & SQL query builder     |
| Validation       | Zod                                          | Runtime input schema validation          |
| Auth             | jsonwebtoken + bcrypt + cookie-parser       | JWT issuance, password hashing, cookies  |
| Logging          | Winston + Morgan                            | Structured logs + HTTP request logging   |
| Security         | Helmet + CORS                               | HTTP headers & cross-origin policy       |
| Security         | @arcjet/node                                | Rate limiting, bot detection & Shield (SQLi/XSS) |
| Config           | dotenv                                       | Environment variable management          |
| Tooling          | ESLint + Prettier                           | Code quality & formatting                |

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
│   └── security.middleware.js   # Arcjet protect() gate, runs before all routes
├── routes/
│   └── auth.route.js            # /api/auth/* route definitions
├── controllers/
│   └── auth.controller.js       # Request/response handlers, validation, cookies
├── services/
│   └── auth.service.js          # Business logic: hashing, DB queries
├── validations/
│   └── auth.validations.js      # Zod schemas for register & login
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

| Method | Endpoint            | Auth      | Request Body                  | Success Response              | Description                      |
| ------ | ------------------- | --------- | ----------------------------- | ----------------------------- | -------------------------------- |
| POST   | `/api/auth/register`| Public    | `{ name, email, password, role? }` | `201` + user + token cookie | Create a new user account        |
| POST   | `/api/auth/login`   | Public    | `{ email, password }`         | `200` + user + token cookie   | Authenticate and start a session |
| POST   | `/api/auth/logout`  | Public    | —                             | `200` + message               | Clear the token cookie           |
| GET    | `/health`           | Public    | —                             | `200` `{ status, timestamp, uptime }` | Health/liveness check  |
| GET    | `/api`              | Public    | —                             | `200` `{ message }`           | API root ping                    |

### Error Handling

| Scenario               | Status | Response                                |
| ---------------------- | ------ | --------------------------------------- |
| Validation failed      | 400    | `{ error, details }` (formatted by Zod) |
| Email already taken    | 409    | `{ message: "User already exists" }`    |
| Account not found      | 404    | `{ message: "User not found" }`         |
| Wrong password         | 401    | `{ message: "Invalid credentials" }`    |
| Bot / attack detected  | 403    | `{ error: "Forbidden" }`                |
| Rate limit exceeded    | 429    | `{ error, message, retryAfter }`        |
| Unexpected server error| 500    | passed to Express error middleware      |

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

| Script                 | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start server with hot reload         |
| `npm run lint`         | Run ESLint                           |
| `npm run lint:fix`     | Auto-fix lint issues                 |
| `npm run format`       | Format code with Prettier            |
| `npm run format:check` | Check formatting                     |
| `npm run db:generate`  | Generate Drizzle migrations          |
| `npm run db:migrate`   | Apply migrations                     |
| `npm run db:studio`    | Open Drizzle Studio                  |

## Roadmap / Next Steps

- Role-based access control (RBAC) middleware for protected `/api/admin` routes.
- Refresh-token rotation for longer-lived sessions.
- Password reset & email verification flows.
- Unit/integration tests (Vitest + Supertest).
- Frontend reference implementation (React/Next.js).
