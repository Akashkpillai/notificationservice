# 📋 PROJECT COMPLETION PLAN
## Notification System — Senior System Design Roadmap

> **Author perspective**: Senior System Designer + Project Manager  
> **Project**: Event-Driven Multi-Channel Notification Microservice  
> **Stack**: NestJS · Kafka · PostgreSQL · Prisma · Redis · Docker  
> **Estimated Total Effort**: ~3–4 weeks (solo developer)  
> **Current Status**: Foundation complete. Infrastructure designed. Business logic = 0%.

---

## ⚠️ WHERE THE PROJECT STANDS TODAY

The architecture blueprint is done and the skeleton is committed.
Think of it like a building: the foundation and steel frame are up.
But there are no walls, no wiring, and no plumbing yet.

**What works today:**
- API Gateway receives requests, validates JWT, rate limits, publishes to Kafka ✅
- Shared library (DTOs, enums, interfaces, Kafka topics) ✅
- Database schema designed (Prisma) ✅
- Docker infrastructure (Postgres, Redis, Kafka, Zookeeper) ✅

**What does NOT work today:**
- No service actually reads from Kafka ❌
- No notification is ever delivered (email/sms/push) ❌
- No user preferences are checked ❌
- No retry logic is wired ❌
- No data is ever written to the database ❌

---

## 🗺️ PHASE OVERVIEW

```
PHASE 1 → Fix broken foundation          (Week 1, Days 1–3)
PHASE 2 → Build the notification router  (Week 1, Days 4–7)
PHASE 3 → Build channel consumers        (Week 2)
PHASE 4 → Persistence & reliability      (Week 3, Days 1–4)
PHASE 5 → Security hardening             (Week 3, Days 5–7)
PHASE 6 → Observability & DevOps         (Week 4, Days 1–4)
PHASE 7 → Testing & documentation        (Week 4, Days 5–7)
```

---

## ✅ PHASE 1 — FIX THE BROKEN FOUNDATION
> **Goal**: Make the existing code production-safe before adding new features.  
> **Rule**: Never build on a broken base.

### 1.1 — Critical Bug Fixes

- [ ] **Fix Docker Compose healthcheck user mismatch**
  - The Postgres healthcheck uses `-U admin` but the DB user is `postgres`
  - This causes Kafka to never start cleanly because it waits for Postgres
  - File: `docker-compose.yml` → line 18

- [ ] **Remove duplicate global filter and interceptor registration**
  - `LoggingInterceptor` and `HttpExceptionFilter` are registered in BOTH `main.ts` AND `app.module.ts`
  - This causes every request to be logged and every error to be formatted twice
  - Decision: Keep the `APP_INTERCEPTOR` / `APP_FILTER` approach in `app.module.ts` (supports DI)
  - Remove the `useGlobalFilters()` and `useGlobalInterceptors()` calls in `main.ts`

- [ ] **Fix Logging Interceptor — status code always shows 200**
  - The status code is read BEFORE the handler runs, so errors always log as 200
  - Move the `response.statusCode` read INSIDE the `tap()` callback
  - File: `apps/api-gateway/src/interceptors/logging.interceptor.ts`

- [ ] **Add missing `url` field to Prisma datasource**
  - The `datasource db` block in `schema.prisma` is missing `url = env("DATABASE_URL")`
  - Without this, standard `prisma migrate` commands fail
  - File: `prisma/schema.prisma`

### 1.2 — TypeScript & Config Hardening

- [ ] **Enable `noImplicitAny` in TypeScript config**
  - Currently `noImplicitAny: false` — this allows silent `any` types everywhere
  - Enable it and fix the resulting type errors
  - File: `tsconfig.json`

- [ ] **Create a `JwtPayload` interface in the common library**
  - The JWT `validate()` function currently accepts `payload: any` and returns it blindly
  - Define a proper interface: `{ sub: string, email: string, iat: number, exp: number }`
  - File: `libs/common/src/interfaces/` → new file `jwt-payload.interface.ts`
  - Update `libs/common/src/index.ts` to export it

- [ ] **Update `jwt.strategy.ts` to use the `JwtPayload` interface**
  - Replace `payload: any` with the new typed interface
  - Validate that `sub` exists in the payload before returning
  - File: `apps/api-gateway/src/guards/jwt.strategy.ts`

### 1.3 — Project Structure Cleanup

- [ ] **Move auth files into `src/modules/auth/` folder**
  - Currently: `src/guards/auth.module.ts`, `src/guards/jwt.strategy.ts`, `src/guards/jwt-auth.guard.ts`
  - Should be: `src/modules/auth/auth.module.ts`, etc. (consistent with health + notifications pattern)
  - Update all imports after moving

- [ ] **Remove the unused `notification-system` app (or define its role)**
  - There is an `apps/notification-system/` app that is the default NestJS scaffold and serves no purpose
  - Decision needed: either delete it or rename/repurpose it as the monorepo entry point

- [ ] **Remove `exports: [NotificationService]` from `NotificationModule`**
  - `NotificationService` is not consumed by any other module — dead export
  - File: `apps/api-gateway/src/modules/notifications/notification.module.ts`

---

## ✅ PHASE 2 — BUILD THE NOTIFICATION ROUTER (notification-services)
> **Goal**: The router service is the brain. It consumes events, checks user preferences, persists records, and fans out to channel topics.  
> **This is the most architecturally important service.**

### 2.1 — Refactor as a Real Kafka Microservice

- [ ] **Rewrite `notification-services/src/main.ts`**
  - Replace `NestFactory.create()` (HTTP server) with `NestFactory.createMicroservice()` (Kafka consumer)
  - Connect to the `notifications.requested` topic
  - Use the consumer group `notification-router-group`

- [ ] **Set up Prisma inside `notification-services`**
  - Add a `PrismaModule` (or reuse from common) that provides `PrismaClient`
  - Configure `DATABASE_URL` via `ConfigService`
  - This service owns database writes for the initial notification record

### 2.2 — Implement the Router Controller

- [ ] **Create a Kafka event handler for `notifications.requested`**
  - Use `@MessagePattern(KAFKA_TOPICS.NOTIFICATION_REQUESTED)` or `@EventPattern()`
  - Receive a `NotificationEventDto` payload
  - This replaces the current `getHello()` placeholder

- [ ] **Implement user preference check**
  - Before routing, query `UserPreference` table for the `userId`
  - If the user has disabled the requested channel (e.g., `sms: false`), skip delivery
  - Log a clear message explaining why the notification was skipped
  - If no preference record exists for the user, create one with defaults

- [ ] **Persist the initial notification record**
  - On receiving an event, write a new row to the `notifications` table with `status: PENDING`
  - Store the full message payload as JSON in the `payload` column
  - Store the `id` from the event so it can be used for status updates later

- [ ] **Route to the correct channel topic**
  - After validation and persistence, re-publish the event to the appropriate topic:
    - `type: EMAIL` → publish to `notifications.email`
    - `type: SMS` → publish to `notifications.sms`
    - `type: PUSH` → publish to `notifications.push`
  - Use the Kafka producer (ClientKafka) inside this service

- [ ] **Handle routing errors**
  - If publishing to a channel topic fails, update the DB record to `FAILED`
  - Log the error with the notification `id` for traceability

---

## ✅ PHASE 3 — BUILD THE CHANNEL CONSUMERS
> **Goal**: The actual delivery workers. Each is an independent, focused microservice.  
> **Rule**: Each service does ONE thing — deliver on its channel. Nothing else.

### 3.1 — Email Service (`email-services`)

- [ ] **Rewrite `email-services/src/main.ts` as a Kafka microservice**
  - Connect to `notifications.email` topic
  - Use consumer group `email-consumer-group` (unique per service!)

- [ ] **Install and configure Nodemailer (or SendGrid SDK)**
  - For local/dev: use Nodemailer with Gmail SMTP or Mailtrap (fake inbox for testing)
  - For production: use SendGrid or AWS SES
  - Add required env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

- [ ] **Implement the email send handler**
  - Consume from `notifications.email`
  - Extract `userId`, `subject`, `message`, `metadata` from the event
  - Compose the email (to, subject, HTML body)
  - Call the SMTP/SendGrid client to send

- [ ] **Implement template support**
  - Query the `NotificationTemplate` table by `channel` and `type`
  - If a template exists, use its `body` with variable substitution (replace `{{variable}}` with `metadata` values)
  - If no template, fall back to the raw `message` field

- [ ] **Update DB record on success**
  - After successful delivery, update the `notifications` row:
    - `status` → `SENT`
    - `sentAt` → current timestamp

- [ ] **Update DB record on failure**
  - On error, update the `notifications` row:
    - `status` → `FAILED`
    - `errorMessage` → the error message string
    - `retries` → increment by 1
  - Publish the event to `notifications.retry` topic for retry handling

### 3.2 — SMS Service (`sms-services`)

- [ ] **Rewrite `sms-services/src/main.ts` as a Kafka microservice**
  - Connect to `notifications.sms` topic
  - Use consumer group `sms-consumer-group`

- [ ] **Install and configure Twilio SDK**
  - Add env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
  - For dev/testing, use Twilio's free trial sandbox

- [ ] **Implement the SMS send handler**
  - Consume from `notifications.sms`
  - Extract phone number from `metadata.phone` (or resolve from userId via user service)
  - Send SMS via Twilio client

- [ ] **Update DB record on success/failure** (same pattern as email service)

### 3.3 — Push Service (`push-services`)

- [ ] **Rewrite `push-services/src/main.ts` as a Kafka microservice**
  - Connect to `notifications.push` topic
  - Use consumer group `push-consumer-group`

- [ ] **Install and configure Firebase Admin SDK (FCM)**
  - Add env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
  - Initialize `firebase-admin` in the module

- [ ] **Implement the push send handler**
  - Consume from `notifications.push`
  - Extract `deviceToken` from `metadata.deviceToken`
  - Send notification via FCM using title (`subject`) and body (`message`)

- [ ] **Update DB record on success/failure** (same pattern)

---

## ✅ PHASE 4 — PERSISTENCE & RELIABILITY
> **Goal**: Make the system fault-tolerant. Messages must not be lost. Failures must be recoverable.  
> **This is what separates a toy project from a production system.**

### 4.1 — Retry Mechanism

- [ ] **Design the retry strategy**
  - Max retries: 3 attempts
  - On each failure in a channel consumer, increment `retries` counter in DB
  - If `retries < 3`: re-publish to `notifications.retry` with a delay
  - If `retries >= 3`: publish to `notifications.dlq` and set `status: DEAD`

- [ ] **Build a retry consumer service**
  - Decide: add retry logic inside each channel consumer OR build a dedicated retry handler
  - Recommended: handle in each channel consumer to keep it self-contained
  - Implement exponential backoff: wait `retries * 30 seconds` before re-processing

- [ ] **Implement Dead Letter Queue (DLQ) logging**
  - Any event landing in `notifications.dlq` should be:
    - Logged with full event data and error history
    - Updated in DB to `status: DEAD`
    - Alerted (email/Slack webhook to the team — optional but important)

### 4.2 — Idempotency

- [ ] **Prevent duplicate deliveries using Redis**
  - Before sending, check Redis for a key like `sent:{notificationId}`
  - If the key exists → skip delivery (already sent), return success
  - If not → send, then set the Redis key with a 24-hour TTL after success
  - This protects against Kafka re-delivery of the same message

- [ ] **Add `correlationId` to `NotificationEventDto`**
  - Add a `correlationId` field to the shared DTO in `libs/common/`
  - The API Gateway should generate and attach this to every event
  - All services must log this ID so you can trace a notification across all services

### 4.3 — New API Endpoints (Extend the API Gateway)

- [ ] **`GET /notifications/:id` — Get notification status**
  - Return the current status of a notification by its ID
  - Useful for clients to poll delivery status

- [ ] **`GET /notifications` — List notifications for a user**
  - Query param: `?userId=xxx&status=sent&page=1&limit=20`
  - Return paginated notification history

- [ ] **`GET /users/:userId/preferences` — Get user notification preferences**
  - Return a user's email/sms/push opt-in settings

- [ ] **`PUT /users/:userId/preferences` — Update user notification preferences**
  - Allow users to opt out of SMS or enable push notifications
  - Body: `{ email: true, sms: false, push: true }`

- [ ] **`POST /notifications/bulk` — Send to multiple users at once**
  - Accept an array of `userId` values with the same message
  - Publish one event per user to Kafka

---

## ✅ PHASE 5 — SECURITY HARDENING
> **Goal**: Make the system safe to expose publicly.  
> **Rule**: Security is not a feature. It is a baseline requirement.

### 5.1 — Authentication & Authorization

- [ ] **Restrict CORS to known origins**
  - Currently `enableCors()` with no config allows ALL origins
  - Add `ALLOWED_ORIGINS` to `.env` and use it: `app.enableCors({ origin: [...] })`

- [ ] **Add API versioning**
  - Prefix all routes with `/api/v1/`
  - This allows future breaking changes without disrupting existing clients

- [ ] **Make `ThrottlerGuard` apply globally (not just on one route)**
  - Move it to `APP_GUARD` in `AppModule` so all future routes are protected by default
  - Add per-route overrides using `@Throttle()` decorator where different limits needed

- [ ] **Validate JWT `sub` field exists in `JwtStrategy.validate()`**
  - Throw `UnauthorizedException` if the payload has no `sub`
  - Never pass through an empty or malformed token

- [ ] **Add request size limit**
  - Prevent payload bomb attacks
  - Configure `body-parser` with a max limit (e.g., `10kb`)

### 5.2 — Secrets Management

- [ ] **Remove `.env` from git history**
  - Run: `git filter-branch` or use `BFG Repo Cleaner` to scrub the `.env` from all commits
  - The `.env` with real secrets was committed in the initial commit — this must be cleaned

- [ ] **Rotate all secrets after the above step**
  - Change `JWT_SECRET` to a new randomly generated value
  - Change the Postgres password
  - Do this BEFORE pushing to a public or shared repo

- [ ] **Add input length validation to DTOs**
  - Add `@MaxLength()` decorators to string fields like `message` and `subject`
  - Prevents storing huge strings in the database

---

## ✅ PHASE 6 — OBSERVABILITY & DEVOPS
> **Goal**: When something breaks in production, you need to know about it immediately and be able to debug it.  
> **Without this phase, you are flying blind.**

### 6.1 — Structured Logging

- [ ] **Upgrade from NestJS default Logger to Pino or Winston**
  - Install `nestjs-pino` (recommended — fastest, JSON output by default)
  - Replace all `new Logger()` instances with Pino
  - Output format in dev: pretty-printed. In prod: JSON (for log aggregators like Datadog/ELK)

- [ ] **Add correlation ID to every log line**
  - Using the `correlationId` from the event, ensure every log in every service includes it
  - This lets you filter all logs related to one notification across 4 different services

### 6.2 — Health Checks (upgrade existing)

- [ ] **Replace the static `{ status: 'ok' }` with real `@nestjs/terminus` checks**
  - Package is already installed — just not used
  - Check: PostgreSQL connectivity (Prisma ping)
  - Check: Kafka broker reachability
  - Check: Redis connectivity
  - Return individual component status so ops knows WHICH dependency is down

### 6.3 — Metrics

- [ ] **Add Prometheus metrics endpoint (`/metrics`)**
  - Install `@willsoto/nestjs-prometheus`
  - Track: total notifications published, delivered, failed, dead-lettered
  - Track: Kafka consumer lag per topic
  - Track: HTTP request duration (p50, p95, p99)

### 6.4 — Dockerize the Applications

- [ ] **Write a `Dockerfile` for each application**
  - Use multi-stage build: `node:20-alpine` base, build stage, production stage
  - Copy only the built `dist/` output — no `node_modules` in final image
  - Never run as root inside the container (`USER node`)

- [ ] **Add the application services to `docker-compose.yml`**
  - Add services: `api-gateway`, `notification-services`, `email-services`, `sms-services`, `push-services`
  - Set `depends_on` with health conditions: wait for Kafka and Postgres to be healthy before starting
  - Mount `.env` as an `env_file` in each service

- [ ] **Add a `docker-compose.override.yml` for local development**
  - Mount source code as volumes for hot-reload
  - Keep the base `docker-compose.yml` for production

### 6.5 — CI/CD Pipeline

- [ ] **Create a GitHub Actions workflow**
  - Trigger: on every `push` to `main` or `Pull Request`
  - Steps in order:
    1. Checkout code
    2. Install dependencies (`pnpm install --frozen-lockfile`)
    3. Run linter (`pnpm lint`)
    4. Run unit tests (`pnpm test`)
    5. Run build (`pnpm build`)
  - Later add: Docker image build + push to Docker Hub or GHCR

---

## ✅ PHASE 7 — TESTING
> **Goal**: Prove the system works. Prove it keeps working when you change things.  
> **Rule**: If it's not tested, it's broken — you just don't know it yet.

### 7.1 — Unit Tests

- [ ] **Write unit tests for `NotificationService` (API Gateway)**
  - Mock `ClientKafka` with Jest
  - Test: valid input → publishes event with correct shape
  - Test: `send()` returns `{ success: true, data: { id, timestamp } }`

- [ ] **Write unit tests for `JwtStrategy`**
  - Test: valid payload passes through
  - Test: missing `sub` throws `UnauthorizedException`

- [ ] **Write unit tests for `HttpExceptionFilter`**
  - Test: `400` errors return the correct error shape with `path` and `timestamp`
  - Test: `401` errors return `success: false`

- [ ] **Write unit tests for each channel service (email, sms, push)**
  - Mock the external provider client (Nodemailer, Twilio, FCM)
  - Test: success path → sends message, updates DB to SENT
  - Test: failure path → updates DB to FAILED, publishes to retry topic
  - Test: 3rd failure → publishes to DLQ, updates DB to DEAD

- [ ] **Write unit tests for the notification router service**
  - Test: routes EMAIL type to `notifications.email` topic
  - Test: routes SMS type to `notifications.sms` topic
  - Test: skips routing if user preference is `false` for that channel

### 7.2 — Integration Tests

- [ ] **Write integration test for `POST /notifications`**
  - Use `supertest` + `@nestjs/testing`
  - Test with a real JWT token (generated in test setup)
  - Test: missing JWT → 401
  - Test: valid body → 201 with `{ success: true, data: { id } }`
  - Test: invalid body (wrong enum value) → 400 with validation errors

- [ ] **Write integration test for the full Kafka flow (end-to-end)**
  - Use `testcontainers` or a local Docker Kafka for tests
  - Test: publish to `notifications.requested` → consumer receives and processes it

### 7.3 — Test Coverage Target

- [ ] **Achieve minimum 70% line coverage across all apps and libs**
  - Run: `pnpm test:cov`
  - Coverage report appears in `./coverage/`
  - Priority order: common library → API Gateway → router service → channel services

---

## 📦 DELIVERABLES CHECKLIST (Final Definition of Done)

> Every item below must be true before this project is considered complete.

### Core Functionality
- [ ] API Gateway accepts a POST request and returns a tracking ID
- [ ] Email is actually delivered to a real inbox (use Mailtrap for dev)
- [ ] SMS is actually sent via Twilio sandbox
- [ ] Push notification is actually sent via FCM test project
- [ ] Failed deliveries are retried up to 3 times automatically
- [ ] After 3 failures, the notification is marked DEAD and logged to DLQ
- [ ] User preferences are respected (opt-out is honoured)
- [ ] All notifications are persisted in the database with correct status

### Code Quality
- [ ] Zero TypeScript `any` types in business logic
- [ ] All lint rules pass with no warnings
- [ ] All files have consistent formatting (Prettier)
- [ ] No dead code, unused exports, or unused imports

### Security
- [ ] `.env` never committed to git (history cleaned)
- [ ] CORS restricted to specific origins
- [ ] All endpoints behind rate limiting
- [ ] JWT validation is strict and typed

### Reliability
- [ ] Redis idempotency prevents duplicate deliveries
- [ ] Retry logic handles transient provider failures
- [ ] DLQ is monitored and logged

### Observability
- [ ] Every request has a correlation ID traceable across all services
- [ ] Health endpoint checks all real dependencies
- [ ] Metrics endpoint is available
- [ ] All services log in structured JSON format in production

### DevOps
- [ ] All 5 services have Dockerfiles
- [ ] `docker compose up` starts the entire system in one command
- [ ] GitHub Actions CI passes on every push

### Testing
- [ ] Unit test coverage ≥ 70%
- [ ] Integration tests for all API endpoints
- [ ] All tests pass in CI

### Documentation
- [ ] `README.md` is accurate and up to date
- [ ] `.env.example` has every required variable documented
- [ ] Swagger UI accurately reflects all available endpoints
- [ ] This `PLAN.md` is updated as tasks are completed

---

## 🗓️ RECOMMENDED EXECUTION ORDER (Week by Week)

| Week | Focus | Goal at End of Week |
|---|---|---|
| **Week 1** | Phase 1 + Phase 2 | No bugs in existing code. Router service works end-to-end in Kafka |
| **Week 2** | Phase 3 | All 3 channel consumers deliver real notifications |
| **Week 3** | Phase 4 + Phase 5 | Retries work. DLQ works. New GET/PUT endpoints added. Security hardened |
| **Week 4** | Phase 6 + Phase 7 | Dockerized. CI working. Tests written. System is demonstrable end-to-end |

---

## 🚦 HOW TO USE THIS FILE

- Work through tasks **in order within each phase** — phases have dependencies
- Mark tasks `[x]` when complete
- If you discover a new task while working, add it to the relevant phase
- Commit this file with every meaningful update: `git commit -m "plan: completed phase 1 bug fixes"`
- **Do not jump ahead** — fixing bugs in Phase 1 before building in Phase 3 is not optional

---

*Last updated: June 2026*  
*Version: 1.0*
