import { NextRequest, NextResponse } from "next/server";
import { processWebhookLead } from "@/services/leads/webhook";
import { handleApiError, apiSuccess } from "@/lib/api";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";
import { RateLimitedError } from "@/lib/errors";
import { Logger, generateRequestId } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const ipAddress = req.ip || req.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    // 1. Rate limiting by IP address
    const rateLimitCheck = await checkRateLimit(
      `webhook:${ipAddress}`,
      RATE_LIMIT_CONFIGS.webhook
    );

    if (!rateLimitCheck.success) {
      throw new RateLimitedError(
        "Rate limit exceeded for lead ingestion webhook. Try again later.",
        requestId
      );
    }

    // 2. Read raw request body directly (never re-stringify)
    const rawBody = await req.text();

    // 3. Extract authentication, HMAC, and idempotency headers
    const authorizationHeader = req.headers.get("authorization");
    const signatureHeader =
      req.headers.get("x-signature") || req.headers.get("x-hub-signature-256");
    const timestampHeader = req.headers.get("x-timestamp");
    const idempotencyKey = req.headers.get("idempotency-key");

    // 4. Process Lead ingestion atomically
    const result = await processWebhookLead({
      rawBody,
      authorizationHeader,
      signatureHeader,
      timestampHeader,
      idempotencyKey,
      ipAddress,
      userAgent,
      requestId,
    });

    const statusCode = result.isDuplicate ? 200 : 201;

    Logger.info("Webhook lead processed successfully", {
      requestId,
      statusCode,
      isDuplicate: result.isDuplicate,
      contactId: result.contactId,
      dealId: result.dealId,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        data: result,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      },
      {
        status: statusCode,
        headers: {
          "X-Request-Id": requestId,
          "X-RateLimit-Limit": String(rateLimitCheck.limit),
          "X-RateLimit-Remaining": String(rateLimitCheck.remaining),
        },
      }
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
