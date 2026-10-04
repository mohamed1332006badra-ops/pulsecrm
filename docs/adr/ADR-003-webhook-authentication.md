# ADR-003: Webhook Authentication and Integrity Model

## Status
Accepted

## Context
PulseCRM accepts inbound leads from untrusted external sources (marketing websites, Facebook Ads, Google Ads, Zapier, Make, and ERP systems) at `POST /api/v1/leads/webhook`. This endpoint is exposed to the public internet and must defend against:
1. Unauthorized submissions (spoofed leads)
2. Man-in-the-middle payload tampering
3. Replay attacks
4. Timing attacks
5. Secret leakage

## Decision
We implemented a strict multi-layer webhook authentication contract:
1. **API Key Authentication**:
   - API keys use prefixing (`pk_live_` + random bytes) for fast database lookup.
   - Raw secrets are never stored in plaintext. Keys are hashed using SHA-256 upon creation and verified with `crypto.timingSafeEqual`.
   - Revoked and expired keys are immediately rejected with specific typed error codes.
2. **HMAC SHA-256 Signature Verification**:
   - Webhook senders must sign the request using HMAC-SHA256 with their API secret.
   - The signed payload is constructed as `timestamp + "." + raw_request_body`.
   - The server verifies against the raw unparsed request string buffer (`req.text()`), eliminating JSON serialization mismatch vulnerabilities.
   - Verification uses constant-time string comparisons to prevent timing side-channel attacks.
3. **Replay Window Tolerance**:
   - Senders provide an `X-Timestamp` header (Unix seconds).
   - The server enforces `Math.abs(now - timestamp) <= WEBHOOK_HMAC_TOLERANCE_SECONDS` (default: 300 seconds).

## Alternatives Considered
- **Bearer Token Only**: Lacks integrity verification. If a request is intercepted or tampered in transit, the server would ingest modified values.
- **Shared Static Secret in Query Params**: Dangerous, easily logged in web server logs, proxy logs, and browser history.

## Consequences
- **Positive**: Cryptographically guaranteed authenticity, payload integrity, and replay attack prevention.
- **Trade-offs**: Inbound integration clients must support computing HMAC-SHA256 signatures and sending timestamps.
