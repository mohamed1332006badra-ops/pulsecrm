import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  hashSecret,
  timingSafeEqual,
  computeWebhookSignature,
  verifyWebhookSignature,
  isTimestampValid,
  computePayloadHash,
} from "@/lib/security";

describe("Cryptographic Security Primitives Unit Tests", () => {
  describe("API Key Generation & Hashing", () => {
    it("generates random key with pk_live_ prefix and valid SHA-256 hash", () => {
      const key = generateApiKey();
      expect(key.rawSecret.startsWith("pk_live_")).toBe(true);
      expect(key.keyPrefix.length).toBe(16);
      expect(key.keyHash).toBe(hashSecret(key.rawSecret));
    });

    it("produces deterministic SHA-256 hashes", () => {
      const h1 = hashSecret("secret_token_123");
      const h2 = hashSecret("secret_token_123");
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64); // 64 hex characters
    });
  });

  describe("Timing-Safe Comparison", () => {
    it("returns true for identical strings", () => {
      expect(timingSafeEqual("secure_hash_abc", "secure_hash_abc")).toBe(true);
    });

    it("returns false for different strings or lengths without leaking timing", () => {
      expect(timingSafeEqual("secure_hash_abc", "secure_hash_xyz")).toBe(false);
      expect(timingSafeEqual("short", "longer_string")).toBe(false);
    });
  });

  describe("HMAC-SHA256 Webhook Signatures", () => {
    const rawBody = JSON.stringify({ name: "Ahmed", value: 50000 });
    const timestamp = 1791158400;
    const secret = "pk_live_sample_webhook_secret_9999";

    it("computes and verifies valid HMAC signature", () => {
      const sig = computeWebhookSignature(rawBody, timestamp, secret);
      expect(sig).toHaveLength(64);

      const isValid = verifyWebhookSignature(rawBody, timestamp, sig, secret);
      expect(isValid).toBe(true);
    });

    it("supports sha256= prefix in incoming signature", () => {
      const sig = computeWebhookSignature(rawBody, timestamp, secret);
      const prefixed = `sha256=${sig}`;
      expect(verifyWebhookSignature(rawBody, timestamp, prefixed, secret)).toBe(true);
    });

    it("rejects signature if payload was tampered in transit", () => {
      const sig = computeWebhookSignature(rawBody, timestamp, secret);
      const tamperedBody = JSON.stringify({ name: "Ahmed", value: 999999 });

      expect(verifyWebhookSignature(tamperedBody, timestamp, sig, secret)).toBe(false);
    });

    it("rejects signature if wrong secret is used", () => {
      const sig = computeWebhookSignature(rawBody, timestamp, secret);
      expect(verifyWebhookSignature(rawBody, timestamp, sig, "wrong_secret")).toBe(false);
    });
  });

  describe("Replay Window Tolerance", () => {
    it("accepts timestamp within 300 second tolerance window", () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const recentTimestamp = nowSeconds - 60; // 60s ago

      const { valid } = isTimestampValid(recentTimestamp, 300);
      expect(valid).toBe(true);
    });

    it("rejects expired or replayed timestamp older than tolerance", () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const staleTimestamp = nowSeconds - 360; // 360s ago (> 300s)

      const { valid, ageSeconds } = isTimestampValid(staleTimestamp, 300);
      expect(valid).toBe(false);
      expect(ageSeconds).toBeGreaterThan(300);
    });

    it("rejects non-numeric timestamp strings", () => {
      const { valid } = isTimestampValid("not-a-timestamp", 300);
      expect(valid).toBe(false);
    });
  });

  describe("Payload Hash Idempotency", () => {
    it("computes stable SHA-256 hash of raw payload", () => {
      const hash1 = computePayloadHash('{"key":"value"}');
      const hash2 = computePayloadHash('{"key":"value"}');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });
});
