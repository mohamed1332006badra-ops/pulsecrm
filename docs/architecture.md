# PulseCRM Architecture Blueprint

## 1. System Architecture Overview

PulseCRM is engineered as a multi-tenant B2B Customer Relationship Management (CRM) platform built on Next.js App Router, PostgreSQL, Drizzle ORM, Supabase Auth, and Vercel AI SDK.

```text
Browser Client
   │
   ▼
Next.js App Router (React Server & Client Components)
   │
   ├── Server Components (Data Hydration & Pre-rendering)
   ├── Client Components (Interactive Kanban, Optimistic Rollback)
   ├── Server Actions (Privileged Mutations with Auth Verification)
   └── Route Handlers (API v1 Webhooks, Health Diagnostics)
           │
           ▼
     Application Services Layer
           │
     ┌─────┼─────────────┐
     ▼     ▼             ▼
   Auth   Domain Logic   AI Copilot
     │     │             │
     └─────┼─────────────┘
           ▼
      Drizzle ORM
           │
           ▼
 PostgreSQL Engine
           │
           ├── Foreign Keys & Constraints
           ├── Atomic Multi-Step Transactions
           ├── Indexing Strategy (Tenant + Foreign Key)
           └── Row Level Security (RLS) Engine
```

## 2. Layer Separation & Responsibilities

| Layer | Responsibility | Key Files |
| :--- | :--- | :--- |
| **Presentation / UI** | Render dense, professional B2B interfaces; optimistic UI; accessibility; command palette | `app/(dashboard)/*`, `components/*` |
| **Validation** | Runtime request parsing, typing, and sanitization using Zod schemas | `lib/validations/index.ts` |
| **Authentication** | Supabase Auth session derivation, demo user switching, active membership verification | `lib/auth/index.ts` |
| **Authorization (RBAC)** | Centralized policy decisions; server-side capability matrix | `lib/authorization/index.ts` |
| **Domain Services** | Atomic business operations, scoring algorithms, webhook processing | `services/*` |
| **Data Persistence** | Drizzle ORM schema, relations, connection pooling | `db/schema.ts`, `db/relations.ts` |
| **Database Engine** | Row Level Security (RLS), constraints, row locking | `db/rls.sql` |

## 3. Multi-Tenancy Architecture

Tenancy is enforced across three defensive perimeters:
1. **Application Context**: Identity and active workspace are resolved exclusively on the server from authenticated sessions. Clients cannot override `organization_id`.
2. **Domain Service Scoping**: All database reads, writes, updates, and deletes explicitly include `eq(table.organization_id, context.organizationId)`.
3. **Database Engine Policies (RLS)**: Row Level Security policies guarantee that even if an application query omits a filter, PostgreSQL rejects cross-tenant row access based on `public.current_user_has_org_membership(organization_id)`.
