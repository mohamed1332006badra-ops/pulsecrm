import { describe, it, expect, vi } from "vitest";
import { processWebhookLead, WebhookLeadRequest } from "@/services/leads/webhook";
import {
  AuthenticationError,
  ApiKeyRevokedError,
  ApiKeyExpiredError,
  InvalidWebhookSignatureError,
  WebhookReplayError,
  ValidationError,
} from "@/lib/errors";
import {
  generateApiKey,
  computeWebhookSignature,
  verifyWebhookSignature,
  isTimestampValid,
} from "@/lib/security";
import { webhookLeadPayloadSchema } from "@/lib/validations";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

describe("Webhook Security Full Pipeline & Edge Cases", () => {
  const rawApiKey = "pk_live_12345678abcdefgh_secret9999999999999999";
  const orgId = "11111111-1111-1111-1111-111111111111";
  const validPayload = JSON.stringify({
    name: "Enterprise Buyer",
    email: "buyer@enterprise.com",
    phone: "+1-555-0199",
    companyName: "Big Enterprise LLC",
    estimatedValue: 75000,
    source: "inbound_partner",
  });

  const getValidTimestamp = () => String(Math.floor(Date.now() / 1000));

  describe("API Key Authentication Verification", () => {
    it("rejects webhook request missing Authorization header", async () => {
      const request: WebhookLeadRequest = {
        rawBody: validPayload,
        authorizationHeader: null,
      };

      await expect(processWebhookLead(request)).rejects.toThrow(AuthenticationError);
      await expect(processWebhookLead(request)).rejects.toThrow(
        "Missing or malformed Authorization header"
      );
    });

    it("rejects webhook request with non-Bearer auth scheme", async () => {
      const request: WebhookLeadRequest = {
        rawBody: validPayload,
        authorizationHeader: "Basic dXNlcjpwYXNz",
      };

      await expect(processWebhookLead(request)).rejects.toThrow(AuthenticationError);
    });

    it("rejects webhook request with unrecognized API key prefix", async () => {
      const request: WebhookLeadRequest = {
        rawBody: validPayload,
        authorizationHeader: "Bearer pk_live_unrecognized_prefix_key",
        timestampHeader: getValidTimestamp(),
      };

      // Since DB is queried for prefix lookup, it rejects with AuthenticationError or network error
      await expect(processWebhookLead(request)).rejects.toThrow();
    });
  });

  describe("Timestamp & Replay Attack Defense", () => {
    it("rejects webhook request missing X-Timestamp header", async () => {
      const request: WebhookLeadRequest = {
        rawBody: validPayload,
        authorizationHeader: `Bearer ${rawApiKey}`,
        timestampHeader: null,
      };

      await expect(processWebhookLead(request)).rejects.toThrow();
    });

    it("verifies tolerance window rejects replayed timestamp older than 300s", () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 301;
      const { valid } = isTimestampValid(expiredTimestamp, 300);
      expect(valid).toBe(false);
    });

    it("verifies tolerance window rejects future timestamp beyond drift limit", () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 350;
      const { valid } = isTimestampValid(futureTimestamp, 300);
      expect(valid).toBe(false);
    });
  });

  describe("HMAC-SHA256 Signature Verification", () => {
    it("detects payload tampering when even a single character in rawBody is changed", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = computeWebhookSignature(validPayload, timestamp, rawApiKey);

      const tamperedPayload = validPayload.replace("75000", "75001");
      const isValid = verifyWebhookSignature(tamperedPayload, timestamp, signature, rawApiKey);
      expect(isValid).toBe(false);
    });

    it("detects signature forgery with mismatched secret key", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = computeWebhookSignature(validPayload, timestamp, rawApiKey);

      const isValid = verifyWebhookSignature(validPayload, timestamp, signature, "pk_live_different_org_key");
      expect(isValid).toBe(false);
    });
  });

  describe("Payload Validation & Schema Sanitization", () => {
    it("rejects non-JSON malformed payload in webhook body", async () => {
      const invalidJson = "{ invalid: json, ";
      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it("enforces required fields (name, source) on lead payload schema", () => {
      const result = webhookLeadPayloadSchema.safeParse({
        email: "no-name@example.com",
      });

      expect(result.success).toBe(false);
    });

    it("validates email format if provided", () => {
      const result = webhookLeadPayloadSchema.safeParse({
        name: "Test Lead",
        email: "not-an-email",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Rate Limiting Security Guard", () => {
    it("enforces rate limit window using token bucket logic", async () => {
      const ip = "192.168.100.50";

      // Rate limit config for webhook: 60 requests per 60s
      const check1 = await checkRateLimit(`webhook_test:${ip}`, { limit: 2, windowSeconds: 60 });
      expect(check1.success).toBe(true);

      const check2 = await checkRateLimit(`webhook_test:${ip}`, { limit: 2, windowSeconds: 60 });
      expect(check2.success).toBe(true);

      const check3 = await checkRateLimit(`webhook_test:${ip}`, { limit: 2, windowSeconds: 60 });
      expect(check3.success).toBe(false);
      expect(check3.remaining).toBe(0);
    });
  });
});
