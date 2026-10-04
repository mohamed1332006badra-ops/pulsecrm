import crypto from "crypto";

export interface LogContext {
  requestId?: string;
  organizationId?: string;
  userId?: string;
  route?: string;
  operation?: string;
  durationMs?: number;
  statusCode?: number;
  errorCode?: string;
  [key: string]: unknown;
}

const REDACTED_KEYS = new Set([
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "api_key",
  "password",
  "token",
  "signature",
  "x-signature",
  "key_hash",
  "service_role_key",
]);

/**
 * Recursively sanitize objects to prevent leaking secrets in logs
 */
export function sanitizeLogData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey) || lowerKey.includes("secret") || lowerKey.includes("password")) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString("hex")}`;
}

export class Logger {
  static info(message: string, context?: LogContext): void {
    const payload = {
      level: "info",
      timestamp: new Date().toISOString(),
      message,
      ...(context ? (sanitizeLogData(context) as LogContext) : {}),
    };
    console.log(JSON.stringify(payload));
  }

  static warn(message: string, context?: LogContext): void {
    const payload = {
      level: "warn",
      timestamp: new Date().toISOString(),
      message,
      ...(context ? (sanitizeLogData(context) as LogContext) : {}),
    };
    console.warn(JSON.stringify(payload));
  }

  static error(message: string, error?: Error | unknown, context?: LogContext): void {
    const payload = {
      level: "error",
      timestamp: new Date().toISOString(),
      message,
      errorMessage: error instanceof Error ? error.message : String(error),
      ...(context ? (sanitizeLogData(context) as LogContext) : {}),
    };
    console.error(JSON.stringify(payload));
  }
}
