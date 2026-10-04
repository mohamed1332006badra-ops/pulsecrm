# ADR-002: Row Level Security (RLS) and Role-Based Authorization Model

## Status
Accepted

## Context
In an enterprise CRM, authorization cannot be solely binary (tenant vs. non-tenant). Different users within the organization possess distinct responsibilities:
- `owner`: Full control including billing, member invitation, API keys, and workspace settings.
- `admin`: Operational management of team members, pipeline settings, audit logs, and deals.
- `sales_rep`: Lead management, deal pipeline movement, call notes, and task completion for assigned or unassigned accounts. Restricted from administrative functions.
- `viewer`: Read-only access to customer 360 and analytics dashboards.

Furthermore, UI element hiding (disabled buttons) is not authorization. Authorization must be enforced independently on the backend and database.

## Decision
We implemented a dual-layer authorization architecture:
1. **Database Layer (RLS)**:
   - PostgreSQL policies define granular capabilities for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
   - Security functions `current_user_has_org_membership(target_org_id)` and `current_user_org_role(target_org_id)` resolve user identity via `auth.uid()`.
   - Critical tables like `audit_logs` enforce append-only policies (updates and deletes evaluate to `false`).
2. **Application Layer (RBAC Engine)**:
   - Centralized policy functions in `lib/authorization/index.ts` (`canCreateDeal`, `canEditContact`, `canMoveDeal`, `canExportData`, etc.) provide typed, testable, and reusable authorization rules.
   - Eliminates ad-hoc `if (role === 'admin')` statements scattered across React components.
   - Server Actions and API endpoints validate `AuthContext` before invoking domain services.
3. **Session Resolution & Production Demo Isolation (`lib/auth/index.ts`)**:
   - In production (`NODE_ENV === "production"`), demo user fallback is strictly prohibited. Requests lacking a valid session token (`pulse_session_token` / Supabase Auth) receive `AuthenticationError` (401).
   - Demo mode is isolated to non-production environments (`NODE_ENV !== "production"`) or explicit developer flags (`DEMO_MODE === "true"`), preventing accidental privilege escalation in live deployments.

## Alternatives Considered
- **Frontend-only checks**: Rejected immediately as insecure.
- **Purely database-only checks without service layer checks**: Results in unformatted database constraint error exceptions bubbling up to client requests rather than clear, typed HTTP 403 Forbidden responses.

## Consequences
- **Positive**: Complete defense-in-depth. If application code errs, PostgreSQL RLS rejects unauthorized queries. If RLS is bypassed by service role during migrations, application-level policy guards still enforce RBAC.
- **Trade-offs**: Policy logic is declared in both SQL (`rls.sql`) and TypeScript (`lib/authorization/index.ts`), necessitating synchronized unit and integration tests.
