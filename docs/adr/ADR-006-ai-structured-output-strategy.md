# ADR-006: AI Structured Output Strategy and Safety Model

## Status
Accepted

## Context
AI integration in SaaS CRM applications frequently suffers from:
1. Hallucinated or non-deterministic unstructured text output.
2. Fragile `JSON.parse()` routines vulnerable to malformed LLM responses.
3. Security risks where LLMs execute arbitrary database queries or mutate tenant data without human review.
4. Sending unauthorized or cross-tenant data to third-party AI endpoints.

## Decision
We implemented a secure, structured AI Copilot architecture:
1. **Schema-Constrained Generation**:
   - We utilize Zod schemas (`aiAnalysisOutputSchema`) paired with Vercel AI SDK (`generateObject`) to enforce strict type and structure adherence at generation time.
   - The model output is validated against fields: `summary`, `sentiment`, `urgencyLevel`, `actionItems`, and `keyObjections`.
2. **Authorized Tenant Context Boundary**:
   - The AI service accepts only verified `AuthContext` and loads customer context through `getContactById`, ensuring zero cross-tenant data is injected into LLM prompts.
3. **Safety & Human-in-the-Loop**:
   - AI outputs are treated as untrusted suggestions.
   - The AI Copilot is prohibited from directly executing SQL or mutations.
   - Action items require explicit user approval in the UI before conversion to tasks.
4. **Usage and Cost Observability**:
   - Every AI request logs prompt tokens, completion tokens, model name, and estimated cost into the `ai_usage` table.
5. **Deterministic Heuristic Fallback**:
   - If the AI API key is not configured or an upstream network error occurs, a deterministic NLP analyzer provides reliable, testable feedback.

## Alternatives Considered
- **Plain text prompting with regex extraction**: High failure rate, unpredictable formatting.
- **Autonomous agent tool execution without user confirmation**: Dangerously high risk of deleting or overwriting customer records.

## Consequences
- **Positive**: 100% typed output, predictable UI rendering, full cost accounting, zero security bypasses.
- **Trade-offs**: Slightly higher latency for schema validation over unguided streaming.
