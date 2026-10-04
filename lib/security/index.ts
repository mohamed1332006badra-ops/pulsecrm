import crypto from "crypto";

/**
 * Generate a cryptographically secure API key pair:
 * - rawSecret: "pk_live_<32 random hex characters>" (Shown once to the user)
 * - keyPrefix: "pk_live_" + first 8 characters of random hex
 * - keyHash: SHA-256 hash of the full rawSecret
 */
export function generateApiKey(): {
  rawSecret: string;
  keyPrefix: string;
  keyHash: string;
} {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawSecret = `pk_live_${randomBytes}`;
  const keyPrefix = rawSecret.slice(0, 16);
  const keyHash = hashSecret(rawSecret);

  return {
    rawSecret,
    keyPrefix,
    keyHash,
  };
}

/**
 * Compute SHA-256 hash of a raw string secret.
 */
export function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Compute HMAC-SHA256 signature for webhook payload:
 * signature = HMAC-SHA256(secret, timestamp + "." + rawBody)
 */
export function computeWebhookSignature(
  rawBody: string,
  timestamp: number | string,
  secret: string
): string {
  const payloadToSign = `${timestamp}.${rawBody}`;
  return crypto
    .createHmac("sha256", secret)
    .update(payloadToSign, "utf8")
    .digest("hex");
}

/**
 * Verify incoming webhook HMAC signature using constant-time comparison.
 */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: number | string,
  incomingSignature: string,
  secret: string
): boolean {
  if (!incomingSignature || !timestamp || !rawBody) {
    return false;
  }

  // Support signatures with "sha256=" or "v1=" prefix
  const cleanedSignature = incomingSignature.replace(/^(sha256=|v1=)/i, "").trim();
  const expectedSignature = computeWebhookSignature(rawBody, timestamp, secret);

  return timingSafeEqual(cleanedSignature, expectedSignature);
}

/**
 * Check if the webhook timestamp is within the allowable tolerance window (replay attack prevention).
 */
export function isTimestampValid(
  timestamp: number | string,
  toleranceSeconds: number = 300
): { valid: boolean; ageSeconds: number } {
  const tsNum = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(tsNum)) {
    return { valid: false, ageSeconds: Infinity };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = Math.abs(nowSeconds - tsNum);

  return {
    valid: ageSeconds <= toleranceSeconds,
    ageSeconds,
  };
}

/**
 * Compute SHA-256 hash of payload for idempotency checking.
 */
export function computePayloadHash(rawBody: string): string {
  return crypto.createHash("sha256").update(rawBody, "utf8").digest("hex");
}
