# PulseCRM — Enterprise Multi-Tenant B2B CRM

> **Production-grade, enterprise-scale B2B SaaS CRM** built with Next.js 14 App Router, PostgreSQL, Drizzle ORM, Supabase Auth, and Google Gemini AI. Engineered from the ground up for strict multi-tenant isolation, server-side RBAC, concurrency-safe business operations, and defense-in-depth security.

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6_(Strict)-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.35-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss)
![Tests](https://img.shields.io/badge/Tests-111%20passing-brightgreen)
![Security](https://img.shields.io/badge/Security-RLS%20%2B%20HMAC-orange)

---

## 🏛️ Core Architectural Pillars

1. **Enterprise Multi-Tenant Architecture**: Shared database schema with tenant isolation enforced at both the application layer (`WHERE organization_id = $orgId`) and the database engine level via PostgreSQL Row-Level Security (RLS).
2. **PostgreSQL & Row-Level Security (RLS)**: Fine-grained RLS policies on all tenant tables prevent data leaks. Cross-tenant entity injection is blocked at the database boundary.
3. **Server-Side Role-Based Access Control (RBAC)**: Centralized capability engine supporting four distinct personas (`Owner`, `Admin`, `Sales Rep`, `Viewer`). Identity and permissions are derived strictly on the server; client claims are never trusted.
4. **Concurrency-Safe Lead Assignment**: Round-robin sales rep assignment utilizes row-level locking (`SELECT ... FOR UPDATE OF p`) within an ACID transaction, preventing race conditions under high concurrent lead traffic.
5. **HMAC Webhook Security & Ingestion**: High-throughput lead ingestion (`POST /api/v1/leads/webhook`) secured with HMAC-SHA256 signatures, constant-time verification, and a 300-second replay window tolerance.
6. **Transactional Idempotency**: Cryptographic payload hash deduplication on `(organization_id, idempotency_key)` guarantees zero duplicate leads or deals on retry.
7. **AI Sales Copilot**: Google Gemini integration via Vercel AI SDK using `generateObject()` with strict Zod schemas for deterministic, typed extraction. Gracefully falls back to heuristic NLP analysis if unconfigured.
8. **Optimistic UI with Rollback**: Interactive drag-and-drop Kanban pipeline (`@dnd-kit`) provides immediate user feedback with automatic state rollback on version conflicts or server errors.
9. **Forensic Audit Logging**: Append-only audit logs with user agent, IP address, and JSON diffs (`before_state` / `after_state`). Hardened against mutation or deletion via database rules.
10. **Comprehensive Automated Testing**: 111 automated tests covering unit logic, multi-tenant isolation, RBAC matrix, webhook HMAC security, concurrency stress tests, and Playwright end-to-end scenarios.
11. **Production Hardened & Verified**: Strict startup checks ensure required environment variables (`DATABASE_URL`, authentication keys) are enforced in production, while demo fallbacks are restricted.

---

## 📂 Repository Structure

```text
PulseCRM
├── app/                        # Next.js 14 App Router
│   ├── (auth)/login/           # Authentication & Persona Switcher
│   ├── (dashboard)/            # Authenticated Workspace
│   │   ├── page.tsx            # Executive Dashboard (KPIs, Charts, Stream)
│   │   ├── contacts/           # Contact List & Customer 360 View
│   │   ├── deals/              # Kanban Pipeline Board (Drag-and-Drop)
│   │   ├── audit/              # Forensic Audit Trail Viewer
│   │   └── settings/           # Security, Team & Workspace Settings
│   └── api/
│       ├── health/             # Health & Dependency Diagnostics Probe
│       └── v1/leads/webhook/   # Signed Lead Ingestion Webhook Endpoint
├── components/                 # Reusable UI & Domain Components
│   ├── contacts/               # Data tables, filters, contact dialogs
│   ├── customer-360/           # Customer details, activity feed, AI copilot
│   ├── dashboard/              # Metrics cards, activity charts, quick actions
│   ├── kanban/                 # DnD board, deal cards, stage columns
│   └── settings/               # API key generator, member list
├── db/                         # Database Architecture
│   ├── schema.ts               # Drizzle ORM schema (13 tables, typed relations)
│   ├── relations.ts            # Drizzle relational mappings
│   ├── rls.sql                 # PostgreSQL Row-Level Security definitions
│   ├── migrate.ts              # Migration execution runner
│   └── seed.ts                 # Multi-tenant demo seeder (2 tenants, 50+ records)
├── services/                   # Business Domain Services
│   ├── contacts/               # Contact CRUD & audit tracking
│   ├── deals/                  # Deal lifecycle, stage moves & Kanban aggregation
│   ├── leads/                  # Webhook ingestion & deduplication
│   ├── ai/                     # Gemini AI Copilot & heuristic fallback
│   ├── analytics/              # Dashboard metrics & pipeline aggregations
│   ├── assignments/            # Concurrency-safe round-robin distributor
│   ├── audit/                  # Append-only audit log recorder
│   ├── lead-scoring/           # Deterministic explainable lead scoring
│   └── tasks/                  # Follow-up task management
├── lib/                        # Core Utilities & Shared Infrastructure
│   ├── auth/                   # Session verification, demo mode guards
│   ├── authorization/          # RBAC capability matrix & tenant scoping
│   ├── security/               # HMAC-SHA256, API keys, constant-time compare
│   ├── validations/            # Zod validation schemas
│   ├── errors/                 # Typed error taxonomy (AppError, ForbiddenError, etc.)
│   ├── observability/          # Structured logging & request tracing
│   └── rate-limit/             # Sliding-window rate limiter
├── tests/                      # Automated Verification Test Suites
│   ├── unit/                   # Unit tests (RBAC, validation, security, scoring)
│   ├── security/               # Webhook security, replay & tampering tests
│   ├── integration/            # Multi-tenant PostgreSQL isolation tests
│   ├── concurrency/            # Round-robin concurrency & race condition tests
│   └── e2e/                    # Playwright E2E browser test scenarios
└── docs/                       # Engineering Documentation & Architecture
    ├── adr/                    # 7 Architecture Decision Records (ADRs)
    ├── architecture.md         # Full system architecture blueprint
    ├── api.md                  # REST & webhook API specifications
    ├── security.md             # Security architecture & threat defense model
    └── testing.md              # Quality assurance & verification strategy
```

---

## 🚀 Local Setup & Development

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **npm**: v9+
- **PostgreSQL**: v15+ (or Supabase CLI / Docker container)

### Step 1: Clone & Install Dependencies
```bash
git clone <repository-url>
cd pulse-crm
npm install
```

### Step 2: Environment Configuration
Copy the provided `.env.example` template:
```bash
cp .env.example .env.local
```
Review `.env.local`:
- For quick local testing without external services, leave `DEMO_MODE=true`.
- To connect a real database, set `DATABASE_URL`.
- To enable the AI Sales Copilot, supply `GOOGLE_GENERATIVE_AI_API_KEY`.

### Step 3: Database Setup & Migrations
```bash
# Generate SQL migrations from schema
npm run db:generate

# Execute migrations against PostgreSQL
npm run db:migrate

# (Optional) Apply Row-Level Security policies to PostgreSQL
# Execute the SQL commands in db/rls.sql via psql or your database client

# Seed initial multi-tenant test data (Apex Supplies & Horizon Logistics)
npm run db:seed
```

### Step 4: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Authentication Modes: Demo Mode vs. Production

PulseCRM includes a dual-mode authentication layer with explicit security guards:

### 1. Development & Evaluation (`DEMO_MODE=true`)
- Designed for rapid portfolio reviews, QA testing, and local evaluation.
- Provides a **Role Switcher** in the UI to seamlessly toggle between all 4 RBAC roles and across 2 distinct tenants.
- Does not require a live Supabase project to evaluate UI features and business logic.

#### Available Demo Personas

| Name | Role | Organization / Tenant | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Karim Al-Mansoor** | `Owner` | Apex Industrial Supplies | Full control, billing, member management, API keys |
| **Nadia El-Sayed** | `Admin` | Apex Industrial Supplies | Team management, all deals, exports, API keys |
| **Omar Farooq** | `Sales Rep` | Apex Industrial Supplies | Own deals, assigned contacts, move Kanban stages |
| **Laila Mahmoud** | `Sales Rep` | Apex Industrial Supplies | Round-robin lead assignment candidate |
| **Tarek Mostafa** | `Viewer` | Apex Industrial Supplies | Read-only access to dashboard and pipeline |
| **Ziad Al-Hassan** | `Owner` | Horizon Logistics (Tenant 2) | Isolated tenant workspace (Tenant 2 data only) |
| **Sarah Nabil** | `Sales Rep` | Horizon Logistics (Tenant 2) | Isolated tenant sales representative |

### 2. Production Runtime (`NODE_ENV=production`)
- **Strict Guard**: When running in production without explicit `DEMO_MODE=true`, demo persona switching and unauthenticated access are **completely blocked**.
- **Database Connection Guard**: `DATABASE_URL` is mandatory; silent fallbacks to local defaults are prohibited at startup.
- **Session Verification**: Every request requires an authenticated Supabase SSR session token (`pulse_session_token`).
- **Server-Side Validation**: User identity and tenant membership are verified on the server via `organization_members` before fulfilling requests.

---

## 🧪 Comprehensive Verification Suite

Run all verification checks locally:

```bash
# 1. Strict TypeScript compilation check (0 errors)
npm run typecheck

# 2. ESLint code quality check (0 warnings, 0 errors)
npm run lint

# 3. Full automated test suite (111 passed across 10 suites)
npm test

# 4. Production Next.js build
npm run build

# 5. Playwright End-to-End browser tests (requires running instance or dev server)
# Install Playwright browser binaries (first time only):
npx playwright install chromium
npm run test:e2e
```

### Automated Test Breakdown

| Suite | File | Tests | Coverage |
| :--- | :--- | :---: | :--- |
| **Tenant Isolation** | `tests/unit/multi-tenant-isolation.test.ts` | 12 | Query boundaries, schema contracts, audit integrity |
| **RBAC Authorization** | `tests/unit/authorization.test.ts` | 11 | Role matrix (Owner, Admin, Sales Rep, Viewer) |
| **Business Logic** | `tests/unit/business-logic.test.ts` | 27 | HMAC calculation, replay windows, scoring boundaries |
| **Security & Crypto** | `tests/unit/security.test.ts` | 12 | Timing-safe compare, API key hashing, signatures |
| **Lead Scoring** | `tests/unit/lead-scoring.test.ts` | 4 | Deterministic factor weighting, edge cases |
| **Validations** | `tests/unit/validations.test.ts` | 9 | Zod entity schemas, sanitization rules |
| **Auth Hardening** | `tests/unit/production-auth-hardening.test.ts` | 10 | Demo guards, production rejection, fallback rules |
| **DB Isolation** | `tests/integration/multi-tenant-db-isolation.test.ts` | 11 | Direct PostgreSQL AST & service tenant boundary checks |
| **Webhook Security** | `tests/security/webhook-security.test.ts` | 12 | Replay rejection, tampering detection, rate limiting |
| **Concurrency Locks** | `tests/concurrency/assignment-concurrency.test.ts` | 3 | Row-level locking (`FOR UPDATE`), race condition defense |

---

## 📐 Architecture Decision Records (ADRs)

All core architectural decisions are formally documented in [`docs/adr/`](docs/adr/):

- [ADR-001: Multi-Tenancy Strategy](docs/adr/ADR-001-multi-tenancy-strategy.md) — Shared schema with RLS and application-layer defense-in-depth.
- [ADR-002: RLS and Authorization Model](docs/adr/ADR-002-rls-and-authorization-model.md) — Dual enforcement via service context and PostgreSQL engine policies.
- [ADR-003: Webhook Authentication](docs/adr/ADR-003-webhook-authentication.md) — HMAC-SHA256 signatures, raw body buffers, timestamp replay defense.
- [ADR-004: Idempotency Strategy](docs/adr/ADR-004-idempotency-strategy.md) — Cryptographic request hash on composite unique key.
- [ADR-005: Concurrency-Safe Lead Assignment](docs/adr/ADR-005-concurrency-safe-lead-assignment.md) — `SELECT ... FOR UPDATE OF p` row locks for round-robin assignment.
- [ADR-006: AI Structured Output Strategy](docs/adr/ADR-006-ai-structured-output-strategy.md) — Schema-constrained JSON extraction with graceful heuristic fallback.
- [ADR-007: Optimistic UI Strategy](docs/adr/ADR-007-optimistic-ui-strategy.md) — Client-side optimistic Kanban updates with automatic rollback on 409 Conflict.

---

## 📄 License & Attribution

PulseCRM is open-source software crafted to demonstrate production-grade SaaS architecture and engineering excellence.
