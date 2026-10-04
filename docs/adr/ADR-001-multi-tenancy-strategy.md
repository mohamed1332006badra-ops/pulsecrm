# ADR-001: Multi-Tenancy Strategy

## Status
Accepted

## Context
PulseCRM is an enterprise-grade multi-tenant B2B CRM SaaS application. In multi-tenant environments, data leakage between competing businesses (e.g. Apex Industrial Supplies vs. Horizon Logistics) is the most critical failure mode. We required an architectural model that provides absolute tenant isolation, prevents unauthorized access even under software bug scenarios, and remains computationally efficient and maintainable.

## Decision
We adopted a **shared-database, shared-schema architecture with row-level discriminator keys (`organization_id`) combined with database-enforced Row-Level Security (RLS) and service-layer tenancy guarantees**.

Key elements of this decision:
1. **Mandatory Tenant Boundary**: Every tenant-owned table contains an explicit `organization_id` foreign key referencing the `organizations` table with `ON DELETE CASCADE`.
2. **Compound / Foreign Key Integrity**: Relationships across tables (e.g. Deals -> Contacts) validate tenant ownership to prevent cross-tenant referencing (a deal in Tenant A cannot link to a contact in Tenant B).
3. **Database-Engine Enforcement**: PostgreSQL Row Level Security (RLS) is enabled on all tenant tables. Policies execute `current_user_has_org_membership(organization_id)` using security definer functions reading from `organization_members`.
4. **Service-Layer Guardrails**: Domain services (`ContactService`, `DealService`, etc.) accept an immutable `AuthContext` derived exclusively from server-verified sessions, automatically scoping all WHERE clauses to `organization_id`.
5. **Membership Model**: Users can belong to multiple workspaces through the `organization_members` table, but workspace switching strictly verifies active membership before updating the session context.

## Alternatives Considered
- **Database-per-tenant**: Provides physical isolation but incurs high operational overhead, expensive cross-tenant database migrations, and poor connection pool resource utilization on serverless deployments.
- **Schema-per-tenant**: Improves isolation over shared schema but increases PostgreSQL migration complexity, table cache explosion, and connection pooling issues with transactional poolers.
- **Application-only isolation (No RLS)**: Rejected because a single missing WHERE clause in an ad-hoc query can cause catastrophic data leakage.

## Consequences
- **Positive**: High database resource density, simplified connection pooling, strict multi-layered defense (application + database engine), automated tenant cascade deletions.
- **Trade-offs**: Requires writing explicit RLS policies for all tables and ensuring developer queries always thread the verified `organizationId`.
