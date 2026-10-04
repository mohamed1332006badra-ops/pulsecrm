# PulseCRM Testing & Quality Assurance Strategy

## 1. Testing Pyramid

PulseCRM employs an exhaustive, multi-tier testing strategy covering every layer of the application:

```text
       ┌───────────────┐
       │   E2E Tests   │  Playwright (User flows, multi-tenant isolation, Kanban)
       ├───────────────┤
       │ Concurrency   │  Simultaneous webhook lead assignment race tests
       ├───────────────┤
       │ Security / IT │  Cross-tenant denial, RBAC matrix, HMAC, Replay
       ├───────────────┤
       │  Unit Tests   │  Vitest (Schemas, Scoring, HMAC, Errors, Observability)
       └───────────────┘
```

## 2. Test Execution Commands

| Target | Command | Description |
| :--- | :--- | :--- |
| **All Tests** | `npm run test` | Runs all Vitest test suites |
| **Unit Tests** | `npm run test:unit` | Validations, RBAC policies, HMAC cryptography, Lead scoring |
| **Security Tests** | `npm run test:security` | Multi-tenant isolation, cross-tenant rejection, HMAC tampering |
| **Concurrency Tests** | `npm run test:concurrency` | Simultaneous webhook lead assignments with row-level locks |
| **Integration Tests**| `npm run test:integration` | Service-layer end-to-end database mutations |
| **Type Check** | `npm run typecheck` | Strict TypeScript compiler validation (`strict: true`) |
| **Lint** | `npm run lint` | Next.js and ESLint code quality gates |
| **E2E Tests** | `npm run test:e2e` | Playwright browser automated testing |

## 3. Automated Security Verification

The automated security suite specifically exercises:
1. **Tenant Isolation**: Verifies that User A in Organization A cannot read, update, or delete Organization B records.
2. **Cross-Tenant Relationship Injection**: Verifies that creating a Deal in Organization A referencing a Contact in Organization B fails with `TENANT_ACCESS_DENIED`.
3. **Webhook HMAC Tampering**: Modifying a single character of the payload body invalidates the signature and causes HTTP 401.
4. **Replay Window Protection**: Replayed requests with timestamps beyond 300 seconds are rejected with `WEBHOOK_REPLAY`.
5. **Idempotency Deduplication**: Sending the identical webhook request twice does not create duplicate contacts, deals, or assignments.
6. **Concurrency Safety**: Firing parallel requests simultaneously verifies that sales representatives are distributed correctly without duplicate assignments.
