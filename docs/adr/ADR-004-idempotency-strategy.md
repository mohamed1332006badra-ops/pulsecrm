# ADR-004: Webhook Idempotency Strategy

## Status
Accepted

## Context
Network failures, retry loops in webhook dispatchers (e.g. Stripe, Zapier, Meta Webhooks), and client timeouts frequently result in duplicate HTTP requests. In a CRM, processing a lead twice creates duplicate contacts, duplicate deals, inaccurate pipeline values, double-assigned sales reps, and corrupted activity timelines.

## Decision
We implemented a database-backed idempotency mechanism using the `webhook_events` table:
1. **Idempotency Key Specification**:
   - Clients supply an `Idempotency-Key` HTTP header, or the system falls back to `payload.externalId` or `payload_hash`.
2. **Database Constraint**:
   - A unique composite index `UNIQUE(organization_id, idempotency_key)` guarantees tenant-scoped uniqueness at the engine level.
3. **Lifecycle States**:
   - `pending`: Set at transaction initiation.
   - `processed`: Updated upon successful atomic ingestion.
   - `failed`: Recorded if processing fails irrecoverably.
4. **Duplicate Handling**:
   - When a duplicate request arrives with an existing key marked `processed`, the server skips contact/deal/activity creation and returns HTTP 200 with `{ isDuplicate: true, status: "already_processed" }`.
   - No sales rep is re-assigned, and no duplicate records are created.

## Alternatives Considered
- **In-memory cache (Redis SETNX)**: Fast, but in the event of cache eviction or Redis partition, duplicate leads would enter PostgreSQL.
- **Client-side deduplication**: Untrusted and impossible for third-party webhook publishers.

## Consequences
- **Positive**: Strict deduplication guarantees backed by PostgreSQL ACID transactions.
- **Trade-offs**: Requires an extra indexed row per webhook event in `webhook_events`.
