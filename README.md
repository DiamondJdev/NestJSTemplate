<div align="center">

# NestJS Template

A NestJS backend starter for APIs that need user accounts and role-based access.

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-26.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/redis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Architecture](#architecture) · [Getting started](#getting-started) · [API](#api) · [Configuration](#configuration) · [Development](#development)

</div>

## Overview

Start with registration, login, password changes, and account deletion already wired through controllers, guards, and database services. Add your application modules alongside them.

| Capability | Implementation |
| --- | --- |
| Authentication | Access and refresh JWTs, bearer headers, HttpOnly cookies, refresh token rotation |
| Authorization | `user` and `admin` roles, inherited permissions, route guards, ownership checks |
| Persistence | PostgreSQL with TypeORM repositories and UUID user IDs |
| Caching | Upstash Redis over REST for user records, roles, and refresh token hashes |
| HTTP | DTO validation, CORS allowlist, Helmet headers, throttling, CSRF header checks |

## Architecture

HTTP controllers delegate to services; database services handle persistence and caching. [Module responsibilities](#modules) and the [authentication lifecycle](#how-authentication-works) explain where to make changes.

```mermaid
flowchart LR
    client["Client"] --> http["Throttling + CSRF"]
    subgraph app["NestJS application"]
        http --> routes["Auth · Users · Roles<br/>Controllers + services"]
        routes --> jwt["JWT signing<br/>and verification"]
        routes --> business["Business logic"]
        business --> db["TypeORM services"]
        db --> cache["CacheService"]
    end
    db --> pg[("PostgreSQL")]
    cache --> redis[("Upstash Redis")]
    classDef application fill:#fff1f2,stroke:#be123c,color:#881337
    classDef storage fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
    classDef boundary fill:#f1f5f9,stroke:#64748b,color:#0f172a
    class routes,business,jwt,db,cache application
    class pg,redis storage
    class client,http boundary
```

## Getting started

| Path | API runtime | Database | Requirements |
| --- | --- | --- | --- |
| [Docker Compose](#option-1-docker-compose) | Container with source watching | Bundled PostgreSQL 16 | Git, Docker with Compose v2, OpenSSL |
| [Local Node.js](#option-2-local-nodejs) | Local process with source watching | PostgreSQL from Compose | The tools above, plus Node.js 22 and npm |

Both paths require an Upstash Redis REST URL and token. Compose provisions the API and PostgreSQL; configure Redis separately.

### Configure the environment

1. Clone the repository and create your local environment file:

   ```bash
   git clone https://github.com/DiamondJdev/NestJSTemplate.git my-app
   cd my-app
   cp .env.example .env
   ```

2. Generate a signing secret and a separate encryption key:

   ```bash
   openssl rand -base64 64
   openssl rand -hex 32
   ```

3. Set these four values in `.env`:

   | Variable | Value |
   | --- | --- |
   | `JWT_SECRET` | Output of the first command |
   | `TOKEN_ENCRYPTION_KEY` | Output of the second command, exactly 64 hex characters |
   | `UPSTASH_REDIS_REST_URL` | REST URL from your Upstash Redis database |
   | `UPSTASH_REDIS_REST_TOKEN` | REST token from the same database |

   Keep the remaining example settings for development. Keep `.env` private and back up the encryption key; stored refresh token hashes cannot be decrypted without it.

### Option 1: Docker Compose

```bash
docker compose up --build
```

Compose pins the API to port `5200`, connects it to the bundled database, and enables development schema synchronization. Editing `src/` triggers a rebuild.

### Option 2: Local Node.js

Install dependencies and start the database:

```bash
npm ci
docker compose up -d postgres
```

Set the host database connection in `.env`:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/template_dev"
DB_SSL="false"
DB_SYNC="true"
```

Start the API:

```bash
npm run dev
```

If the Compose API is already running, free port `5200` with `docker compose stop api` before starting the local process. `npm run start:dev` is an alias for `npm run dev`; both use `PORT` from `.env`.

### Verify the server

```bash
curl http://localhost:5200/health
```

| Address | Purpose |
| --- | --- |
| [localhost:5200](http://localhost:5200/) | Swagger UI with request schemas and interactive API calls |
| [localhost:5200/health](http://localhost:5200/health) | API status and PostgreSQL connectivity |

A successful health response has `database.status` and `backend.status` set to `healthy`. A failed database check returns `503`. The cache status is currently hardcoded to healthy, so this response does not verify Redis.

Compose creates `template_dev` and `template_test` when PostgreSQL first starts with an empty volume. Stop the stack with `docker compose down`; database data remains in `postgres_data`.

## First request

Register a development account:

```bash
curl -X POST http://localhost:5200/auth/register \
  -H 'Content-Type: application/json' \
  -H 'X-Requested-With: XMLHttpRequest' \
  -d '{"username":"demo","password":"ExamplePass123!"}'
```

The response includes the new user's identity and tokens:

```json
{
  "message": "User registered successfully",
  "accessToken": "<access-token>",
  "refreshToken": "<refresh-token>",
  "user": {
    "id": "<user-uuid>",
    "username": "demo",
    "roles": ["user"]
  },
  "token_type": "bearer"
}
```

Use the returned access token to read your identity:

```bash
curl http://localhost:5200/auth/me \
  -H 'Authorization: Bearer <access-token>'
```

Registration and login also set HttpOnly cookies. For browser clients, enable credentials on requests and include `X-Requested-With: XMLHttpRequest` on every mutating request. Swagger adds that header automatically.

## Modules

| Module | Responsibility | Starting point |
| --- | --- | --- |
| `auth` | Registration, login, refresh, logout, token cookies, authentication guard | [AuthService](src/modules/auth/auth.service.ts) |
| `users` | Account queries, self-service deletion, password changes, admin operations | [UsersController](src/modules/users/users.controller.ts) |
| `roles` | Role lookup for the caller or an authorized target user | [RolesService](src/modules/roles/roles.service.ts) |
| `db` | User repositories, refresh token persistence, database health checks | [Database services](src/modules/db/services/) |
| `jwt` | JWT signing and verification, refresh token hashing | [JwtService](src/modules/jwt/jwt.service.ts) |

| Shared module | Responsibility | Starting point |
| --- | --- | --- |
| `cache` | Redis reads, writes, invalidation, and cache lifetimes | [CacheService](src/modules/cache/cache.service.ts) |
| `core` | User entity, DTOs, role and CSRF guards, health endpoint, logging | [CoreModule](src/modules/core/core.module.ts) |
| `app` | Environment loading, PostgreSQL configuration, module wiring, global guards | [AppModule](src/modules/app.module.ts) |

[main.ts](src/main.ts) configures middleware, CORS, validation, Swagger, logging, and the HTTP listener.

## API

Base URL: `http://localhost:5200`. Swagger UI is served at `/` during development. It is disabled in production unless `SWAGGER_ENABLED=true`.

All `POST`, `PUT`, `PATCH`, and `DELETE` requests require `X-Requested-With: XMLHttpRequest`, including registration and login. Protected endpoints accept `Authorization: Bearer <access-token>` or the `accessToken` cookie. Browser clients using cookies must send requests with credentials enabled.

### Authentication

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create an account; body: `{ username, password }` |
| `POST` | `/auth/login` | Public | Authenticate; body: `{ username, password }` |
| `PATCH` | `/auth/refresh` | Refresh token | Replace tokens; cookie or body: `{ refreshToken }` |
| `DELETE` | `/auth/logout` | Authenticated | Clear refresh token and cookies |
| `GET` | `/auth/me` | Authenticated | Read caller identity |

Refresh does not require a valid access token. Supplying a refresh token in both the cookie and body returns `400`.

### Accounts

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/users` | Admin | List users; query: `limit` (default `50`), `page` (default `0`) |
| `GET` | `/users/me` | User or admin | Read caller profile |
| `DELETE` | `/users/me` | Authenticated | Delete caller account |
| `DELETE` | `/users/:uuid` | Admin | Delete a user |

### Passwords and roles

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `PATCH` | `/users/password` | User or admin | Change own password; body: `{ currentPassword, password }` |
| `PATCH` | `/users/password/:uuid` | Admin | Reset a password; body: `{ password }` |
| `GET` | `/roles/me` | User or admin | Read caller roles |
| `GET` | `/roles/:uuid` | Owner or admin | Read a user's roles |
| `GET` | `/health` | Public | Check API and database status |

Usernames must contain 3–64 alphanumeric characters. Registration passwords must contain 12–128 characters, including an uppercase letter, lowercase letter, number, and symbol. DTO validation strips unknown properties. Malformed UUID route parameters return `400`.

The `admin` role inherits `user` permissions. There is no public role assignment endpoint; provision admin roles through a controlled database operation or your own administrative workflow.

### How authentication works

<details>
<summary>Token issuance, refresh, and session limits</summary>

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Auth API
    participant J as JWT service
    participant D as Database services
    participant P as PostgreSQL
    C->>A: POST /auth/login + CSRF header
    A->>D: Find user by username
    D->>P: Read user and password hash
    P-->>D: User record
    D-->>A: User and password hash
    Note over A: Compare password with bcrypt
    A->>J: Generate access and refresh JWTs
    J-->>A: Tokens, refresh hash, expiry
    A->>D: Save refresh hash and expiry
    D->>P: Encrypt hash and update user
    Note over D: Update Redis cache
    A-->>C: Token JSON + HttpOnly cookies
    C->>A: PATCH /auth/refresh + CSRF header
    Note over C,A: Send refresh token in cookie OR body
    A->>J: Verify JWT signature and expiry
    A->>D: Read user and stored refresh hash
    D-->>A: User, hash, and expiry
    A->>J: Compare refresh token with stored hash
    Note over A,P: Generate and persist replacement tokens
    A-->>C: Replacement token JSON + cookies
```

Passwords use bcrypt with cost `12`. Refresh tokens are SHA-256 digested before bcrypt hashing with cost `10`; the database column stores that hash encrypted with AES-256-GCM. Redis caches the refresh hash without that column encryption.

Each user has one stored refresh token hash. Login and refresh overwrite it, so separate concurrent device sessions are not modeled. Logout clears the stored refresh token and browser cookies. An already issued access token can remain usable until it expires.

</details>

## Configuration

Copy [.env.example](.env.example) for the complete development configuration. The application loads `.env` through `@nestjs/config`.

### Connections and server

| Variable | Behavior |
| --- | --- |
| `PORT` | HTTP listener; falls back to `5200` when unset. Compose pins it to `5200`. |
| `ALLOWED_ORIGINS` | Required comma-separated CORS allowlist; include the origins used by your frontend. |
| `DATABASE_URL` | PostgreSQL connection string. Compose overrides it for the bundled database. |
| `DB_SSL` | Enables database SSL only when set to `true`. |
| `DB_SYNC` | Enables automatic schema synchronization only when set to `true`. Use it only on disposable development databases. |

### Authentication

| Variable | Behavior |
| --- | --- |
| `JWT_SECRET` | Required signing secret. Replace the example value. |
| `JWT_ACCESS_EXP` | Required access token lifetime; the example uses `15m`. |
| `JWT_REFRESH_EXP` | Required refresh token lifetime; the example uses `7d`. |
| `TOKEN_ENCRYPTION_KEY` | Required 32-byte key encoded as 64 hex characters; checked at startup. |

### Cache and runtime

| Variable | Behavior |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash REST endpoint; configure it before starting the API. |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token; configure it before starting the API. |
| `NODE_ENV` | Controls production cookies, console logging, Swagger defaults, and database logging. |
| `SWAGGER_ENABLED` | Set to `true` to expose Swagger in production. Swagger is always enabled outside production. |

Cache operations catch Redis failures: reads become cache misses and failed writes or invalidations are ignored. The health endpoint currently does not report those failures.

## Development

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with source watching |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm run start:prod` | Run the compiled API in production mode |
| `npm run lint` | Run ESLint with automatic fixes; may modify source files |

### Tests

| Command | Purpose |
| --- | --- |
| `npm test -- --runInBand` | Run unit tests without external services |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:cov` | Generate unit test coverage |
| `npm run test:e2e` | Run the integration suite against PostgreSQL |

Unit tests live beside their source as `*.spec.ts`. End-to-end tests live in `test/`, use the real application modules and PostgreSQL, and replace Redis with an in-memory fake.

For end-to-end tests, start the Compose database and configure `.env.test` with a dedicated test database, token settings, and encryption key. The test command loads that file with Node's `--env-file` option. Use `template_test` with the bundled database; do not point the suite at a database containing data you need.

### Logging

The custom logger writes under `logs/` and also prints to the console outside production.

| File | Contents |
| --- | --- |
| `combined.log` | All log levels and user activity events |
| `error.log` | Error entries |
| `stats.log` | User activity events |

The HTTP interceptor records method, URL, status, duration, and caller ID when available. See [LOGGING.md](LOGGING.md) for additional usage examples.

## Troubleshooting

| Symptom | Check or fix |
| --- | --- |
| Startup reports a missing or invalid encryption key | Set `TOKEN_ENCRYPTION_KEY` in `.env` to the 64 hex characters from `openssl rand -hex 32`. |
| Registration or login returns a CSRF `403` | Include `X-Requested-With: XMLHttpRequest`. Bearer authentication does not exempt a mutating request from this check. |
| Local startup reports port `5200` in use | If the Compose API is running, stop it with `docker compose stop api`. |
| A source edit is not reflected in the Compose API | Run `docker compose restart api`; the watch process can hit a port conflict during restart. |
| `/health` passes but cached reads fail | Check the Upstash REST URL and token separately. The health endpoint does not probe Redis. |

## Deployment

Build the production image:

```bash
docker build --target prod -t template-backend:prod .
```

The image runs `node dist/src/main` as the unprivileged `node` user and polls `/health`. Supply environment variables and provision PostgreSQL and Upstash Redis at runtime.

Before deploying:

1. Set `NODE_ENV=production`, restrict `ALLOWED_ORIGINS`, and terminate HTTPS so secure cookies can be sent.
2. Keep `DB_SYNC=false` and manage schema changes through a migration workflow. This repository does not include migration scripts.
3. Provide a writable `logs/` directory for the container user, with persistence and rotation appropriate to your host.
4. Review proxy trust settings in `src/main.ts` and throttling for your hosting topology. The default rate-limit storage is local to each process.
5. Verify Redis separately from `/health`, and keep Swagger disabled unless you intend to expose it.

## Contributing

Open an issue for a bug or proposed change. For pull requests, keep the scope focused, include tests for behavior changes, and run the unit tests, lint, and build commands before submitting. Include end-to-end results when changing routes or persistence.

## License

MIT, as declared in [package.json](package.json).
