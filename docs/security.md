# PulseCRM Security Architecture & Defense Model

## 1. Core Security Tenet
**Never trust client input.** The server derives identity, permissions, and tenant boundaries strictly from validated sessions and database state. Hidden buttons, client-provided IDs, and disabled HTML elements are not authorization.

## 2. Row-Level Security (RLS)
Every tenant table enforces PostgreSQL Row-Level Security. Policies derive the user's identity through `auth.uid()` and determine active workspace membership:

```sql
CREATE POLICY "contacts_select_policy" ON public.contacts
  FOR SELECT
  USING (
    public.current_user_has_org_membership(organization_id)
  );
```

### Protection Against Cross-Tenant Injections
When mutating foreign-key relationships (e.g. associating a deal with a contact), the system validates that both entities share the authorized `organization_id`. A user in Tenant A cannot link a deal to a contact belonging to Tenant B.

## 3. Role-Based Access Control (RBAC) Matrix

| Operation | Owner | Admin | Sales Rep | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| View Dashboard & Analytics | Yes | Yes | Yes | Yes |
| View Contacts & Deals | Yes | Yes | Yes | Yes |
| Create Contact / Deal | Yes | Yes | Yes | No |
| Edit Contact / Deal | Yes | Yes | Own / Unassigned | No |
| Delete Contact / Deal | Yes | Yes | No | No |
| Move Deal Stage | Yes | Yes | Own / Unassigned | No |
| AI Copilot Analysis | Yes | Yes | Yes | No |
| Export Contacts (CSV) | Yes | Yes | No | No |
| Manage Team Members | Yes | Yes (Non-Owner) | No | No |
| Manage API Keys | Yes | Yes | No | No |
| View Audit Logs | Yes | Yes | No | No |
| Manage Workspace / Billing | Yes | Restricted | No | No |

## 4. Webhook Security Architecture

Inbound lead ingestion at `POST /api/v1/leads/webhook` enforces 10 defense perimeters:
1. **API Key Hash Lookup**: Prefixed key lookup (`pk_live_...`) with SHA-256 hash comparison.
2. **Timing Attack Protection**: Hash and signature checks use `crypto.timingSafeEqual`.
3. **Expiration & Revocation Verification**: Expired or revoked keys are rejected immediately.
4. **Timestamp Verification**: Requests older than 300 seconds (configurable) are rejected to stop replay attacks.
5. **HMAC-SHA256 Signature Verification**: Evaluates `HMAC(secret, timestamp + "." + rawBody)`.
6. **Raw Body Integrity**: Verification runs directly against the raw unparsed HTTP body string buffer.
7. **Rate Limiting**: Sliding window counter blocks brute-force attempts.
8. **Schema Validation**: Strict Zod schema strips unrecognized fields.
9. **Engine Idempotency**: Unique constraint on `(organization_id, idempotency_key)` prevents double-ingestion.
10. **Concurrency-Safe Atomicity**: Entire lead creation, round-robin assignment with `FOR UPDATE OF p`, activity creation, and audit logging execute inside a single PostgreSQL ACID transaction.

## 5. Secret Redaction & Observability
Server logs automatically sanitize authorization headers, API keys, password fields, and HMAC signatures. Request IDs (`req_...`) correlate client actions with server audit records.
