# 🔔 Notification System

A **production-grade, event-driven microservices notification platform** built with NestJS, Apache Kafka, PostgreSQL, and Prisma. The system supports multi-channel delivery (Email, SMS, Push) through an async message-driven architecture.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Services](#services)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Kafka Topics](#kafka-topics)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Services](#running-the-services)
- [Development Scripts](#development-scripts)
- [Authentication](#authentication)
- [Error Handling](#error-handling)

---

## Overview

The Notification System is a scalable microservices backend that decouples **notification triggering** from **notification delivery**. A single REST API call on the API Gateway publishes an event to Kafka, which fans out to dedicated consumer microservices for email, SMS, and push delivery.

### Key Design Principles

- **Async by default** — HTTP requests return immediately after publishing to Kafka; delivery happens asynchronously
- **Channel isolation** — each delivery channel (Email/SMS/Push) is an independent microservice
- **Fault tolerance** — built-in retry logic and a Dead Letter Queue (DLQ) for failed deliveries
- **Shared contracts** — all services share DTOs, enums, and interfaces via a `@app/common` library to prevent drift

---

## Architecture

```
                      ┌──────────────────────────────────┐
  REST Client         │        API Gateway (:3000)        │
  ──────────────────► │  JWT Auth  │  Rate Limiting       │
                      │  Swagger UI │  Validation Pipe    │
                      └─────────────────┬────────────────┘
                                        │
                            publish event to Kafka
                                        │
                                        ▼
                      ┌──────────────────────────────────┐
                      │    notifications.requested        │
                      │         (Kafka Topic)             │
                      └─────────────────┬────────────────┘
                                        │
                                        ▼
                      ┌──────────────────────────────────┐
                      │    notification-services          │
                      │      (Router / Orchestrator)      │
                      │  Routes by type → channel topic  │
                      │  Persists initial DB record       │
                      └───┬─────────────┬───────────┬───┘
                          │             │           │
               email ▼          sms ▼       push ▼
          ┌───────────────┐ ┌──────────┐ ┌─────────────┐
          │ email-services│ │sms-svc   │ │push-services│
          │  Kafka Consumer│ │Kafka Cns │ │Kafka Consumer│
          │  SMTP Delivery │ │  Twilio  │ │  FCM/APNs   │
          │  → DB update  │ │→ DB updt │ │ → DB update │
          └───────────────┘ └──────────┘ └─────────────┘
                          │             │           │
                          └──────────────┴───────────┘
                                        │
                                        ▼
                      ┌──────────────────────────────────┐
                      │      PostgreSQL (via Prisma)      │
                      │  notifications  │  user_prefs     │
                      │  templates      │                  │
                      └──────────────────────────────────┘
```

### Request Flow (Step by Step)

1. **Client** sends `POST /notifications` with a JWT Bearer token
2. **API Gateway** validates JWT, applies rate limit, validates the request body
3. **API Gateway** enriches the DTO with `id`, `timestamp`, `source`, and `retries`
4. **API Gateway** publishes the `NotificationEventDto` to the `notifications.requested` Kafka topic
5. **Notification-services** (router) consumes the event, writes a `PENDING` record to PostgreSQL, and re-publishes to the appropriate channel topic
6. **Channel consumer** (email/sms/push) consumes from its topic, sends the notification, and updates the DB record to `SENT` or `FAILED`
7. On failure, the event is re-published to `notifications.retry` (up to N retries), after which it moves to `notifications.dlq`

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **NestJS 11** | Application framework (all services) |
| **TypeScript 5.7** | Language |
| **Apache Kafka** | Async message broker between services |
| **PostgreSQL 15** | Primary persistence database |
| **Prisma 7** | ORM and database migrations |
| **Redis 7** | (Reserved) Caching, idempotency store |
| **Passport + JWT** | API authentication |
| **Helmet** | HTTP security headers |
| **@nestjs/throttler** | Rate limiting |
| **@nestjs/swagger** | API documentation (OpenAPI 3) |
| **class-validator** | Request body validation |
| **Docker Compose** | Local infrastructure orchestration |
| **pnpm** | Package manager |

---

## Project Structure

```
notification-system/
│
├── apps/                          # NestJS monorepo applications
│   ├── api-gateway/               # ← Main HTTP entry point
│   │   └── src/
│   │       ├── filters/           # Global exception filter
│   │       ├── guards/            # JWT auth guard + strategy + AuthModule
│   │       ├── interceptors/      # Logging interceptor
│   │       ├── modules/
│   │       │   ├── health/        # Health check endpoint
│   │       │   └── notifications/ # Core controller + Kafka producer
│   │       ├── app.module.ts
│   │       └── main.ts
│   │
│   ├── notification-services/     # ← Kafka router (orchestrator)
│   ├── email-services/            # ← Email delivery consumer
│   ├── sms-services/              # ← SMS delivery consumer
│   ├── push-services/             # ← Push notification consumer
│   └── notification-system/       # ← Root NestJS app (monorepo entry)
│
├── libs/
│   └── common/src/                # ← Shared library (@app/common)
│       ├── dto/
│       │   ├── create-notification.dto.ts   # HTTP request DTO
│       │   └── notification-event.dto.ts    # Kafka event DTO
│       ├── enums/
│       │   ├── notification-type.enum.ts    # EMAIL | SMS | PUSH
│       │   ├── notification-channel.enum.ts # ORDER | PAYMENT | PROMO | ...
│       │   └── notification-status.enum.ts  # PENDING | SENT | FAILED | DEAD
│       ├── interfaces/
│       │   └── notification-interface.ts    # INotification, IUserPreference, ITemplate
│       ├── kafka/
│       │   └── kafka-topic.ts               # Kafka topic name constants
│       └── index.ts                         # Public exports barrel
│
├── prisma/
│   ├── schema.prisma              # DB schema: Notification, UserPreference, Template
│   └── migrations/                # Prisma migration history
│
├── docker-compose.yml             # PostgreSQL, Redis, Kafka, Zookeeper
├── nest-cli.json                  # Monorepo project config
├── tsconfig.json                  # TypeScript config with path aliases
├── .env.example                   # Environment variable template
└── package.json
```

---

## Services

### API Gateway (`apps/api-gateway`)

The single HTTP entry point for the entire system. Responsible for:

- **Authentication**: JWT Bearer token validation via Passport
- **Rate Limiting**: 100 requests per 60 seconds per client via `@nestjs/throttler`
- **Input Validation**: `ValidationPipe` with strict mode (whitelist + forbid unknown)
- **Event Publishing**: Publishes validated requests to Kafka as `NotificationEventDto`
- **Swagger UI**: Available at `/api/docs`
- **Security**: HTTP headers via Helmet
- **Observability**: Structured request/response logging with duration

**Runs on**: `http://localhost:3000`

---

### Notification-Services (`apps/notification-services`)

The Kafka consumer that acts as a **router/orchestrator**. Responsible for:

- Consuming from `notifications.requested`
- Persisting the initial notification record to PostgreSQL with `PENDING` status
- Routing to the correct channel topic based on `type` (EMAIL → `notifications.email`, etc.)
- Checking user preferences before routing

---

### Email-Services (`apps/email-services`)

Kafka consumer for the `notifications.email` topic. Responsible for:

- Sending transactional emails (SMTP via Nodemailer, or SES/SendGrid)
- Updating notification status to `SENT` or `FAILED` in PostgreSQL
- Handling retries via `notifications.retry` topic

---

### SMS-Services (`apps/sms-services`)

Kafka consumer for the `notifications.sms` topic. Responsible for:

- Sending SMS messages via Twilio (or similar provider)
- Updating notification status in PostgreSQL

---

### Push-Services (`apps/push-services`)

Kafka consumer for the `notifications.push` topic. Responsible for:

- Sending push notifications via Firebase Cloud Messaging (FCM) or APNs
- Updating notification status in PostgreSQL

---

## Data Models

### `Notification`

Every delivery attempt is logged here.

| Field | Type | Description |
|---|---|---|
| `id` | `String (UUID)` | Unique notification ID |
| `userId` | `String` | Target user identifier |
| `type` | `String` | Delivery mechanism: `email`, `sms`, `push` |
| `channel` | `String` | Business trigger: `order`, `payment`, `promo`, `alert`, `login`, `signup` |
| `status` | `String` | Lifecycle: `pending` → `sent` / `failed` → `dead` |
| `payload` | `Json` | Full message content (flexible) |
| `retries` | `Int` | Number of delivery attempts |
| `errorMessage` | `String?` | Last error message (nullable) |
| `sentAt` | `DateTime?` | Delivery timestamp (null until sent) |
| `createdAt` | `DateTime` | Record creation time |

### `UserPreference`

Per-user opt-in/opt-out settings for notification channels.

| Field | Type | Description |
|---|---|---|
| `id` | `String (UUID)` | Record ID |
| `userId` | `String (unique)` | User this preference belongs to |
| `email` | `Boolean` | Email notifications enabled (default: true) |
| `sms` | `Boolean` | SMS notifications enabled (default: false) |
| `push` | `Boolean` | Push notifications enabled (default: true) |
| `createdAt` | `DateTime` | Record creation time |
| `updatedAt` | `DateTime` | Last modified (auto-updated) |

### `NotificationTemplate`

Reusable message templates with variable substitution.

| Field | Type | Description |
|---|---|---|
| `id` | `String (UUID)` | Template ID |
| `name` | `String (unique)` | Template identifier (e.g., `order_shipped`, `otp_sms`) |
| `type` | `String` | Delivery type this template is for |
| `subject` | `String?` | Email subject (nullable, email only) |
| `body` | `String` | Template body with `{{variable}}` placeholders |
| `isActive` | `Boolean` | Whether this template is active (default: true) |
| `createdAt` | `DateTime` | Record creation time |

---

## API Reference

Base URL: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api/docs`

### `POST /notifications`

Publishes a notification event to the async delivery pipeline.

**Auth**: Requires `Authorization: Bearer <jwt_token>` header

**Request Body**:
```json
{
  "userId": "user-uuid-123",
  "type": "email",
  "channel": "order",
  "subject": "Your order has been shipped!",
  "message": "Your order #1234 is on the way!",
  "metadata": {
    "orderId": "1234",
    "trackingUrl": "https://track.example.com"
  }
}
```

**Fields**:

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | ✅ | Target user ID |
| `type` | `enum` | ✅ | `email` \| `sms` \| `push` |
| `channel` | `enum` | ✅ | `order` \| `payment` \| `promo` \| `alert` \| `login` \| `signup` |
| `message` | `string` | ✅ | Notification body text |
| `subject` | `string` | ❌ | Email subject line (email only) |
| `metadata` | `object` | ❌ | Extra data for template rendering |

**Success Response** `201`:
```json
{
  "success": true,
  "message": "Notification request published successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-06-14T01:30:00.000Z"
  }
}
```

**Error Responses**:
- `401` — Missing or invalid JWT token
- `429` — Rate limit exceeded (100 req/60s)
- `400` — Validation error (invalid body)

---

### `GET /health`

Checks if the API Gateway is alive.

**Auth**: None required

**Response** `200`:
```json
{ "status": "ok" }
```

---

## Kafka Topics

All topic names are defined in `libs/common/src/kafka/kafka-topic.ts` and shared across all services.

| Constant | Topic Name | Purpose |
|---|---|---|
| `NOTIFICATION_REQUESTED` | `notifications.requested` | API Gateway → Router |
| `EMAIL_NOTIFICATIONS` | `notifications.email` | Router → Email consumer |
| `SMS_NOTIFICATIONS` | `notifications.sms` | Router → SMS consumer |
| `PUSH_NOTIFICATIONS` | `notifications.push` | Router → Push consumer |
| `NOTIFICATIONS_RETRY` | `notifications.retry` | Failed deliveries for retry |
| `NOTIFICATIONS_DLQ` | `notifications.dlq` | Dead-letter queue (3+ failures) |

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Docker** and **Docker Compose**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd notification-system
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](#environment-variables)).

### 4. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **Redis** on port `6379`
- **Zookeeper** on port `2181`
- **Kafka** on port `9092`

Wait for all services to be healthy:
```bash
docker compose ps
```

### 5. Run Database Migrations

```bash
pnpm prisma migrate dev
```

### 6. Start the API Gateway

```bash
pnpm nest start api-gateway --watch
```

The API Gateway will be available at:
- **API**: `http://localhost:3000`
- **Swagger UI**: `http://localhost:3000/api/docs`

### 7. Start Consumer Services (separate terminals)

```bash
# Email consumer
pnpm nest start email-services --watch

# SMS consumer
pnpm nest start sms-services --watch

# Push consumer
pnpm nest start push-services --watch

# Notification router
pnpm nest start notification-services --watch
```

---

## Environment Variables

Create a `.env` file in the project root. See `.env.example` for reference.

```env
# ─── PostgreSQL ──────────────────────────────────────
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/notification_db"

# ─── Redis ───────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ─── Kafka ───────────────────────────────────────────
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=api-gateway
KAFKA_GROUP_ID=api-gateway-group

# ─── Application ─────────────────────────────────────
NODE_ENV=development
PORT=3000

# ─── JWT Authentication ───────────────────────────────
JWT_SECRET=<your-strong-secret-key-min-32-chars>
JWT_EXPIRES_IN=7d
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_HOST` | ✅ | Redis hostname |
| `REDIS_PORT` | ✅ | Redis port (default: 6379) |
| `KAFKA_BROKER` | ✅ | Kafka broker address |
| `KAFKA_CLIENT_ID` | ✅ | Unique client ID for this service |
| `KAFKA_GROUP_ID` | ✅ | Kafka consumer group ID |
| `PORT` | ❌ | HTTP port (default: 3000) |
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars in production) |
| `JWT_EXPIRES_IN` | ❌ | Token expiry (default: `7d`) |

> ⚠️ **Never commit your `.env` file.** It is listed in `.gitignore`. Use `.env.example` to document required variables.

---

## Running the Services

### Development Mode (with hot reload)

```bash
# API Gateway
pnpm nest start api-gateway --watch

# Individual consumers
pnpm nest start notification-services --watch
pnpm nest start email-services --watch
pnpm nest start sms-services --watch
pnpm nest start push-services --watch
```

### Production Build

```bash
# Build all apps
pnpm nest build api-gateway
pnpm nest build notification-services
pnpm nest build email-services
pnpm nest build sms-services
pnpm nest build push-services

# Run built output
node dist/apps/api-gateway/main
```

---

## Development Scripts

| Script | Description |
|---|---|
| `pnpm start` | Start the default app |
| `pnpm start:dev` | Start with hot reload |
| `pnpm build` | Build all apps |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:cov` | Generate test coverage report |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm lint` | Lint and auto-fix TypeScript files |
| `pnpm format` | Prettier format all source files |
| `pnpm prisma migrate dev` | Create and apply a new migration |
| `pnpm prisma studio` | Open Prisma Studio (DB GUI) |
| `pnpm prisma generate` | Regenerate Prisma client |

---

## Authentication

The API uses **JWT Bearer Token** authentication.

### How to Authenticate

1. Obtain a JWT token from your auth service (signing with the same `JWT_SECRET`)
2. Include it in the `Authorization` header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

### Generating a Test Token (Development Only)

You can generate a test token using the JWT secret from your `.env`:

```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'user-123', email: 'test@example.com' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
console.log(token);
```

Or use the **Swagger UI** at `/api/docs` — click "Authorize" and paste your token.

---

## Error Handling

All errors from the API Gateway are returned in a consistent shape:

```json
{
  "success": false,
  "statusCode": 400,
  "message": ["type must be a valid enum value"],
  "timestamp": "2026-06-14T01:30:00.000Z",
  "path": "/notifications"
}
```

### Common Error Codes

| Status | Cause |
|---|---|
| `400 Bad Request` | Validation failed (invalid body fields) |
| `401 Unauthorized` | Missing, expired, or invalid JWT token |
| `403 Forbidden` | Valid token but insufficient permissions |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unhandled server error |

---

## Notification Channels & Types

### Notification Types (Delivery Method)

| Value | Description |
|---|---|
| `email` | Delivered via email (SMTP / SendGrid / SES) |
| `sms` | Delivered via SMS (Twilio / Vonage) |
| `push` | Delivered via push notification (FCM / APNs) |

### Notification Channels (Business Trigger)

| Value | Description | Example Use Case |
|---|---|---|
| `order` | Order lifecycle events | "Your order #1234 has been shipped" |
| `payment` | Payment events | "Payment of $99 received" |
| `promo` | Promotional messages | "50% off this weekend only!" |
| `alert` | Security / system alerts | "New login from unknown device" |
| `login` | Login OTP / verification | "Your OTP is 123456" |
| `signup` | Welcome / onboarding | "Welcome to our platform!" |

### Notification Status Lifecycle

```
PENDING  →  SENT      (successful delivery)
PENDING  →  FAILED    (delivery error, will retry)
FAILED   →  FAILED    (retry attempt, still failing)
FAILED   →  DEAD      (3+ failures → moved to DLQ)
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following the existing code style
4. Run lint and tests: `pnpm lint && pnpm test`
5. Commit with a descriptive message: `git commit -m "feat: add email delivery with Nodemailer"`
6. Push and open a Pull Request

---

## License

UNLICENSED — Private project.
