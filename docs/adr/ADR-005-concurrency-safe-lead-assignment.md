# ADR-005: Concurrency-Safe Round-Robin Lead Assignment

## Status
Accepted

## Context
When incoming lead volume spikes (e.g. during a live marketing webinar or ad campaign launch), multiple webhook lead requests arrive simultaneously. Naive assignment implementations:
```sql
SELECT id FROM profiles ORDER BY last_lead_assigned_at ASC LIMIT 1;
UPDATE profiles SET last_lead_assigned_at = now() WHERE id = ...;
```
suffer from race conditions. Two concurrent transactions read the same least-recently-assigned representative before either updates the timestamp, causing rep skew and violating round-robin distribution.

## Decision
We implemented **transactional row-level pessimistic locking (`FOR UPDATE OF p`)** on candidate representative profiles within the enclosing lead transaction:

```sql
SELECT p.id, p.full_name, p.email, p.last_lead_assigned_at
FROM profiles p
INNER JOIN organization_members om ON om.user_id = p.id
WHERE om.organization_id = $1
  AND om.status = 'active'
  AND om.role IN ('sales_rep', 'admin', 'owner')
ORDER BY p.last_lead_assigned_at ASC NULLS FIRST
LIMIT 1
FOR UPDATE OF p;
```

How this guarantees safety:
1. `FOR UPDATE OF p` locks the chosen row against concurrent transactions attempting to read/lock the same row.
2. Concurrent transactions evaluating the candidate row queue or skip to the next eligible representative once the timestamp is updated.
3. The timestamp `p.last_lead_assigned_at` is updated within the exact same transaction before commit.
4. Only active members belonging to the authorized tenant are eligible for selection.

## Alternatives Considered
- **Advisory Locks (`pg_advisory_xact_lock`)**: Effective, but locks the entire organization queue, serializing all leads even if there are 50 available representatives.
- **Optimistic Concurrency with retry loop**: Leads to excessive transaction rollbacks and retries under high concurrency.
- **Round-robin counter in Redis**: Decouples assignment from PostgreSQL transaction commit; if the PostgreSQL transaction rolls back, the Redis counter is already incremented.

## Consequences
- **Positive**: Strict concurrency safety, deterministic round-robin assignment, zero rep starvation, fully contained in standard PostgreSQL transactions.
- **Trade-offs**: Very brief row-level lock duration during the transaction.
