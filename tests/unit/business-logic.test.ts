import { describe, it, expect } from "vitest";
import {
  verifyWebhookSignature,
  computeWebhookSignature,
  isTimestampValid,
  generateApiKey,
  hashSecret,
  timingSafeEqual,
} from "@/lib/security";
import { calculateLeadScore } from "@/services/lead-scoring";

// ─── Webhook Signature Tests ──────────────────────────────────────────────────

describe("Webhook HMAC Signature Verification", () => {
  const secret = "test-webhook-secret-32-bytes-long!!";

  it("accepts a valid HMAC-SHA256 signature", () => {
    const payload = JSON.stringify({ name: "Acme Corp", email: "info@acme.com" });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = computeWebhookSignature(payload, timestamp, secret);

    const isValid = verifyWebhookSignature(payload, timestamp, signature, secret);
    expect(isValid).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const originalPayload = JSON.stringify({ name: "Legitimate" });
    const tamperedPayload = JSON.stringify({ name: "Injected" });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = computeWebhookSignature(originalPayload, timestamp, secret);

    // Use tampered payload with original signature
    const isValid = verifyWebhookSignature(tamperedPayload, timestamp, signature, secret);
    expect(isValid).toBe(false);
  });

  it("rejects a completely wrong signature", () => {
    const payload = JSON.stringify({ name: "Legitimate" });
    const timestamp = Math.floor(Date.now() / 1000);

    const isValid = verifyWebhookSignature(payload, timestamp, "wrong-signature", secret);
    expect(isValid).toBe(false);
  });

  it("rejects an empty signature", () => {
    const isValid = verifyWebhookSignature("{}", 123456789, "", secret);
    expect(isValid).toBe(false);
  });

  it("signature computed with wrong secret fails verification", () => {
    const payload = JSON.stringify({ name: "Test" });
    const timestamp = Math.floor(Date.now() / 1000);
    const wrongSignature = computeWebhookSignature(payload, timestamp, "wrong-secret");

    const isValid = verifyWebhookSignature(payload, timestamp, wrongSignature, secret);
    expect(isValid).toBe(false);
  });

  it("accepts signature with v1= prefix (Stripe-style)", () => {
    const payload = JSON.stringify({ event: "lead.created" });
    const timestamp = Math.floor(Date.now() / 1000);
    const rawSignature = computeWebhookSignature(payload, timestamp, secret);

    // With v1= prefix
    const isValid = verifyWebhookSignature(payload, timestamp, `v1=${rawSignature}`, secret);
    expect(isValid).toBe(true);
  });
});

// ─── Timestamp Replay Attack Prevention Tests ─────────────────────────────────

describe("Webhook Timestamp Replay Attack Prevention", () => {
  it("accepts a fresh timestamp within tolerance", () => {
    const freshTimestamp = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
    const { valid } = isTimestampValid(freshTimestamp, 300);
    expect(valid).toBe(true);
  });

  it("rejects a stale timestamp beyond tolerance window", () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const { valid } = isTimestampValid(staleTimestamp, 300); // 5 min tolerance
    expect(valid).toBe(false);
  });

  it("rejects non-numeric timestamp strings", () => {
    const { valid } = isTimestampValid("not-a-timestamp", 300);
    expect(valid).toBe(false);
  });

  it("returns correct age in seconds", () => {
    const tenSecondsAgo = Math.floor(Date.now() / 1000) - 10;
    const { ageSeconds } = isTimestampValid(tenSecondsAgo, 300);
    // Allow 2 second margin for test execution time
    expect(ageSeconds).toBeGreaterThanOrEqual(9);
    expect(ageSeconds).toBeLessThanOrEqual(12);
  });
});

// ─── Round-Robin Assignment Distribution Logic ────────────────────────────────

describe("Round-Robin Assignment Distribution Logic", () => {
  /**
   * Pure round-robin selector — equivalent to what assignNextSalesRep does
   * at the database level using ORDER BY last_lead_assigned_at ASC NULLS FIRST.
   */
  function roundRobin<T>(items: T[], index: number): T {
    if (items.length === 0) throw new Error("No items available for assignment");
    return items[index % items.length];
  }

  const reps = ["rep-a", "rep-b", "rep-c"];

  it("distributes assignments evenly across 3 reps over 9 rounds", () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 9; i++) {
      const rep = roundRobin(reps, i);
      counts[rep] = (counts[rep] || 0) + 1;
    }
    expect(counts["rep-a"]).toBe(3);
    expect(counts["rep-b"]).toBe(3);
    expect(counts["rep-c"]).toBe(3);
  });

  it("handles single rep by always selecting them", () => {
    for (let i = 0; i < 5; i++) {
      expect(roundRobin(["rep-only"], i)).toBe("rep-only");
    }
  });

  it("throws on empty rep list", () => {
    expect(() => roundRobin([], 0)).toThrow();
  });

  it("wraps correctly at boundaries (modulo arithmetic)", () => {
    expect(roundRobin(reps, 3)).toBe(roundRobin(reps, 0));
    expect(roundRobin(reps, 4)).toBe(roundRobin(reps, 1));
    expect(roundRobin(reps, 5)).toBe(roundRobin(reps, 2));
  });
});

// ─── API Key Security Tests ───────────────────────────────────────────────────

describe("API Key Security", () => {
  it("generates a key with the correct pk_live_ prefix", () => {
    const { rawSecret, keyPrefix, keyHash } = generateApiKey();
    expect(rawSecret).toMatch(/^pk_live_[a-f0-9]+$/);
    expect(rawSecret.startsWith(keyPrefix)).toBe(true);
    expect(keyHash).toHaveLength(64); // SHA-256 hex
  });

  it("hashes are deterministic for the same input", () => {
    const secret = "super-secret-key";
    expect(hashSecret(secret)).toBe(hashSecret(secret));
  });

  it("hash is not equal to the raw secret (actually hashed)", () => {
    const secret = "my-raw-key";
    expect(hashSecret(secret)).not.toBe(secret);
  });

  it("timing-safe equality returns true for identical strings", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
  });

  it("timing-safe equality returns false for different strings", () => {
    expect(timingSafeEqual("abc123", "xyz456")).toBe(false);
  });

  it("timing-safe equality returns false for different lengths", () => {
    expect(timingSafeEqual("abc", "abcdef")).toBe(false);
  });
});

// ─── Lead Scoring Tests ───────────────────────────────────────────────────────

describe("ML-Free Lead Scoring Engine", () => {
  it("assigns high score to a fully populated enterprise lead", () => {
    const result = calculateLeadScore({
      email: "sarah@enterprise.com",
      phone: "+971501234567",
      companyName: "Global Trading LLC",
      estimatedValue: 100000,
      source: "website",
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("assigns low score to a sparse lead with minimal info", () => {
    const result = calculateLeadScore({
      email: null,
      phone: null,
      companyName: null,
      estimatedValue: null,
      source: null,
    });

    expect(result.score).toBeLessThan(30);
  });

  it("gives extra points for business email over free email domain", () => {
    const corporateResult = calculateLeadScore({
      email: "ceo@globalcorp.com",
      companyName: "Global Corp",
    });

    const freeEmailResult = calculateLeadScore({
      email: "user@gmail.com",
      companyName: "Global Corp",
    });

    expect(corporateResult.score).toBeGreaterThan(freeEmailResult.score);
  });

  it("awards high value deals significantly more points than low value", () => {
    const highValue = calculateLeadScore({ estimatedValue: 75000 });
    const lowValue = calculateLeadScore({ estimatedValue: 500 });
    expect(highValue.score).toBeGreaterThan(lowValue.score);
  });

  it("produces deterministic scores for identical inputs", () => {
    const input = {
      email: "test@example.com",
      companyName: "Test Corp",
      estimatedValue: 15000,
      source: "website",
    };
    expect(calculateLeadScore(input).score).toBe(calculateLeadScore(input).score);
  });

  it("never produces a score outside the 0-100 range", () => {
    const inputs = [
      {},
      { email: "a@b.com", phone: "+1234", companyName: "Co", estimatedValue: 999999, source: "website" },
      { email: "free@gmail.com" },
    ];

    for (const input of inputs) {
      const { score } = calculateLeadScore(input);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("returns explainable reasons array with factor names and points", () => {
    const result = calculateLeadScore({
      email: "cto@startup.io",
      phone: "+1999888777",
      companyName: "StartupIO",
      source: "landing_page",
    });

    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);

    for (const reason of result.reasons) {
      expect(reason).toHaveProperty("factor");
      expect(reason).toHaveProperty("points");
      expect(reason).toHaveProperty("description");
      expect(reason.points).toBeGreaterThan(0);
    }
  });
});
