export type ErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "TENANT_ACCESS_DENIED"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_WEBHOOK_SIGNATURE"
  | "WEBHOOK_REPLAY"
  | "API_KEY_REVOKED"
  | "API_KEY_EXPIRED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown> | Array<unknown>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | Array<unknown>;
  public readonly requestId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown> | Array<unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): { error: ErrorDetails } {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId: this.requestId,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", requestId?: string) {
    super("AUTHENTICATION_REQUIRED", message, 401, undefined, requestId);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden: insufficient permissions", requestId?: string) {
    super("FORBIDDEN", message, 403, undefined, requestId);
  }
}

export class TenantAccessDeniedError extends AppError {
  constructor(message = "Access to requested tenant is denied", requestId?: string) {
    super("TENANT_ACCESS_DENIED", message, 403, undefined, requestId);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", requestId?: string) {
    super("RESOURCE_NOT_FOUND", `${resource} not found`, 404, undefined, requestId);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown> | Array<unknown>, requestId?: string) {
    super("VALIDATION_ERROR", message, 400, details, requestId);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict or concurrent modification", requestId?: string) {
    super("CONFLICT", message, 409, undefined, requestId);
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message = "Request with this idempotency key already processed", requestId?: string) {
    super("IDEMPOTENCY_CONFLICT", message, 409, undefined, requestId);
  }
}

export class InvalidWebhookSignatureError extends AppError {
  constructor(message = "Invalid or missing webhook signature", requestId?: string) {
    super("INVALID_WEBHOOK_SIGNATURE", message, 401, undefined, requestId);
  }
}

export class WebhookReplayError extends AppError {
  constructor(message = "Webhook timestamp expired or replayed", requestId?: string) {
    super("WEBHOOK_REPLAY", message, 401, undefined, requestId);
  }
}

export class ApiKeyRevokedError extends AppError {
  constructor(message = "API key has been revoked", requestId?: string) {
    super("API_KEY_REVOKED", message, 401, undefined, requestId);
  }
}

export class ApiKeyExpiredError extends AppError {
  constructor(message = "API key has expired", requestId?: string) {
    super("API_KEY_EXPIRED", message, 401, undefined, requestId);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests. Rate limit exceeded", requestId?: string) {
    super("RATE_LIMITED", message, 429, undefined, requestId);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "An internal server error occurred", requestId?: string) {
    super("INTERNAL_ERROR", message, 500, undefined, requestId);
  }
}
