# PulseCRM API Contract & Documentation

## Overview
PulseCRM provides REST endpoints for health checks, system diagnostics, and secure webhook lead ingestion. All API responses conform to typed response formats and structured error definitions.

---

### 1. Health Diagnostics
```http
GET /api/health
```

#### Response (HTTP 200 OK)
```json
{
  "status": "healthy",
  "timestamp": "2026-10-05T00:15:00.000Z",
  "version": "0.1.0",
  "requestId": "req_8f1a23b9",
  "uptimeSeconds": 4820,
  "durationMs": 4,
  "dependencies": {
    "database": {
      "status": "healthy",
      "latencyMs": 2
    }
  }
}
```

---

### 2. Lead Ingestion Webhook
```http
POST /api/v1/leads/webhook
```

#### Required Headers
| Header | Description | Example |
| :--- | :--- | :--- |
| `Authorization` | Bearer token with full raw API key | `Bearer pk_live_apex_crm_demo_key_9999` |
| `X-Signature` | HMAC-SHA256 signature of `timestamp + "." + rawBody` | `a3f89b...` |
| `X-Timestamp` | Unix timestamp in seconds | `1791158400` |
| `Idempotency-Key` | Unique transaction identifier | `idemp_99210_cairo` |
| `Content-Type` | MIME type | `application/json` |

#### Request Body Schema
```json
{
  "name": "Ahmed Soliman",
  "phone": "+20 100 456 7890",
  "email": "a.soliman@cairoheavy.com",
  "companyName": "Cairo Heavy Equipment",
  "dealTitle": "Heavy Machinery Supply Agreement",
  "estimatedValue": 125000,
  "currency": "USD",
  "source": "website",
  "externalId": "ext_lead_4421",
  "notes": "Requested urgent quotation for 3 hydraulic excavators."
}
```

#### Response (HTTP 201 Created)
```json
{
  "data": {
    "success": true,
    "isDuplicate": false,
    "contactId": "55555555-5555-5555-5555-000000000001",
    "dealId": "66666666-6666-6666-6666-000000000001",
    "assignedRep": {
      "id": "00000000-0000-0000-0000-000000000003",
      "name": "Omar Farooq",
      "email": "omar@apexsupplies.com"
    },
    "leadScore": 95,
    "message": "Lead processed and assigned atomically."
  },
  "meta": {
    "requestId": "req_5a10ef22",
    "timestamp": "2026-10-05T00:15:02.100Z",
    "durationMs": 35
  }
}
```

#### Duplicate Idempotency Response (HTTP 200 OK)
```json
{
  "data": {
    "success": true,
    "isDuplicate": true,
    "message": "Request already processed (idempotency enforced)."
  }
}
```

---

## 3. Error Taxonomy & Status Codes

All errors return structured JSON:
```json
{
  "error": {
    "code": "INVALID_WEBHOOK_SIGNATURE",
    "message": "Webhook HMAC signature verification failed.",
    "requestId": "req_..."
  }
}
```

| HTTP Status | Error Code | Trigger Condition |
| :---: | :--- | :--- |
| **400** | `VALIDATION_ERROR` | Malformed JSON or invalid schema attributes |
| **401** | `AUTHENTICATION_REQUIRED` | Missing or invalid API key credentials |
| **401** | `API_KEY_REVOKED` | API key was revoked by organization administrator |
| **401** | `API_KEY_EXPIRED` | API key has passed its expiration date |
| **401** | `INVALID_WEBHOOK_SIGNATURE` | HMAC signature mismatch against raw request body |
| **401** | `WEBHOOK_REPLAY` | Timestamp outside allowable tolerance window |
| **403** | `FORBIDDEN` | Insufficient user role permissions |
| **403** | `TENANT_ACCESS_DENIED` | Attempted cross-tenant access or foreign relationship injection |
| **404** | `RESOURCE_NOT_FOUND` | Contact, deal, or workspace not found |
| **409** | `CONFLICT` | Concurrent optimistic concurrency collision on mutation |
| **409** | `IDEMPOTENCY_CONFLICT` | Unfinished concurrent conflict on same idempotency key |
| **429** | `RATE_LIMITED` | Exceeded endpoint rate limit |
| **500** | `INTERNAL_ERROR` | Unexpected server fault (stack traces sanitized) |
