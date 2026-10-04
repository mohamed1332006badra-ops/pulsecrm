import { db, schema } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import {
  hashSecret,
  timingSafeEqual,
  verifyWebhookSignature,
  isTimestampValid,
  computePayloadHash,
} from "@/lib/security";
import {
  AuthenticationError,
  ApiKeyRevokedError,
  ApiKeyExpiredError,
  InvalidWebhookSignatureError,
  WebhookReplayError,
  ValidationError,
  IdempotencyConflictError,
} from "@/lib/errors";
import { webhookLeadPayloadSchema, WebhookLeadPayload } from "@/lib/validations";
import { calculateLeadScore } from "@/services/lead-scoring";
import { assignNextSalesRep } from "@/services/assignments";
import { recordAuditEvent } from "@/services/audit";

export interface WebhookLeadRequest {
  rawBody: string;
  authorizationHeader?: string | null;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface WebhookLeadResponse {
  success: boolean;
  isDuplicate: boolean;
  contactId?: string;
  dealId?: string;
  assignedRep?: {
    id: string;
    name: string;
    email: string;
  } | null;
  leadScore?: number;
  message: string;
}

export async function processWebhookLead(
  request: WebhookLeadRequest
): Promise<WebhookLeadResponse> {
  // 1. Authenticate API Key
  const authHeader = request.authorizationHeader;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or malformed Authorization header.", request.requestId || undefined);
  }

  const rawApiKey = authHeader.substring(7).trim();
  const prefix = rawApiKey.slice(0, 16);
  const computedHash = hashSecret(rawApiKey);

  const matchedKeys = await db
    .select()
    .from(schema.api_keys)
    .where(eq(schema.api_keys.key_prefix, prefix))
    .limit(1);

  if (matchedKeys.length === 0) {
    throw new AuthenticationError("Invalid API key.", request.requestId || undefined);
  }

  const apiKeyRecord = matchedKeys[0];

  // Constant-time key hash comparison
  if (!timingSafeEqual(computedHash, apiKeyRecord.key_hash)) {
    throw new AuthenticationError("Invalid API key credentials.", request.requestId || undefined);
  }

  // Revocation check
  if (apiKeyRecord.revoked_at) {
    throw new ApiKeyRevokedError("API key has been revoked.", request.requestId || undefined);
  }

  // Expiration check
  if (apiKeyRecord.expires_at && new Date() > apiKeyRecord.expires_at) {
    throw new ApiKeyExpiredError("API key has expired.", request.requestId || undefined);
  }

  const organizationId = apiKeyRecord.organization_id;

  // 2. Timestamp and Replay Verification
  const timestamp = request.timestampHeader;
  if (!timestamp) {
    throw new WebhookReplayError("Missing X-Timestamp header.", request.requestId || undefined);
  }

  const tolerance = parseInt(
    process.env.WEBHOOK_HMAC_TOLERANCE_SECONDS || "300",
    10
  );
  const { valid: timestampValid, ageSeconds } = isTimestampValid(timestamp, tolerance);
  if (!timestampValid) {
    throw new WebhookReplayError(
      `Webhook timestamp expired or outside tolerance window (${ageSeconds}s difference).`,
      request.requestId || undefined
    );
  }

  // 3. HMAC Signature Verification
  const signature = request.signatureHeader;
  if (!signature) {
    throw new InvalidWebhookSignatureError("Missing X-Signature header.", request.requestId || undefined);
  }

  const isSignatureValid = verifyWebhookSignature(
    request.rawBody,
    timestamp,
    signature,
    rawApiKey
  );

  if (!isSignatureValid) {
    throw new InvalidWebhookSignatureError(
      "Webhook HMAC signature verification failed.",
      request.requestId || undefined
    );
  }

  // 4. Request Validation
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(request.rawBody);
  } catch {
    throw new ValidationError("Malformed JSON payload in request body.", undefined, request.requestId || undefined);
  }

  const validationResult = webhookLeadPayloadSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    throw new ValidationError(
      "Webhook lead payload validation failed.",
      validationResult.error.flatten(),
      request.requestId || undefined
    );
  }
  const payload: WebhookLeadPayload = validationResult.data;

  // 5. Idempotency Verification
  const idempotencyKey = request.idempotencyKey || payload.externalId || `hash_${computePayloadHash(request.rawBody)}`;

  const existingEvents = await db
    .select()
    .from(schema.webhook_events)
    .where(
      and(
        eq(schema.webhook_events.organization_id, organizationId),
        eq(schema.webhook_events.idempotency_key, idempotencyKey)
      )
    )
    .limit(1);

  if (existingEvents.length > 0) {
    const existing = existingEvents[0];
    if (existing.status === "processed") {
      return {
        success: true,
        isDuplicate: true,
        message: "Request already processed (idempotency enforced).",
      };
    }
  }

  const payloadHash = computePayloadHash(request.rawBody);

  // 6. Atomic Transaction
  return await db.transaction(async (tx) => {
    // Record webhook event as pending / in-flight
    await tx
      .insert(schema.webhook_events)
      .values({
        organization_id: organizationId,
        idempotency_key: idempotencyKey,
        signature_timestamp: parseInt(timestamp, 10),
        payload_hash: payloadHash,
        status: "pending",
      })
      .onConflictDoNothing();

    // Concurrency-safe round-robin sales rep assignment
    const assignedRep = await assignNextSalesRep(organizationId, tx);

    // Calculate explainable lead score
    const scoreResult = calculateLeadScore({
      email: payload.email,
      phone: payload.phone,
      companyName: payload.companyName,
      estimatedValue: payload.estimatedValue,
      source: payload.source,
    });

    // Create Contact
    const [contact] = await tx
      .insert(schema.contacts)
      .values({
        organization_id: organizationId,
        assigned_to_id: assignedRep?.id || null,
        name: payload.name,
        email: payload.email || null,
        phone: payload.phone,
        company_name: payload.companyName || null,
        status: "new",
        lead_score: scoreResult.score,
        source: payload.source || "webhook",
        external_id: payload.externalId || null,
      })
      .returning();

    // Resolve or create initial pipeline stage ('lead_in')
    let stageId: string;
    const stages = await tx
      .select()
      .from(schema.pipeline_stages)
      .where(
        and(
          eq(schema.pipeline_stages.organization_id, organizationId),
          eq(schema.pipeline_stages.key, "lead_in")
        )
      )
      .limit(1);

    if (stages.length > 0) {
      stageId = stages[0].id;
    } else {
      // Find stage with position 1 or create default
      const anyStage = await tx
        .select()
        .from(schema.pipeline_stages)
        .where(eq(schema.pipeline_stages.organization_id, organizationId))
        .orderBy(schema.pipeline_stages.position)
        .limit(1);

      if (anyStage.length > 0) {
        stageId = anyStage[0].id;
      } else {
        const [newStage] = await tx
          .insert(schema.pipeline_stages)
          .values({
            organization_id: organizationId,
            name: "Lead In",
            key: "lead_in",
            position: 1,
          })
          .returning();
        stageId = newStage.id;
      }
    }

    // Create Deal
    const dealTitle = payload.dealTitle || `${payload.companyName || payload.name} - Opportunity`;
    const [deal] = await tx
      .insert(schema.deals)
      .values({
        organization_id: organizationId,
        contact_id: contact.id,
        assigned_to_id: assignedRep?.id || null,
        pipeline_stage_id: stageId,
        title: dealTitle,
        value: String(payload.estimatedValue || 0),
        currency: payload.currency || "USD",
      })
      .returning();

    // Create Activity
    await tx.insert(schema.activities).values({
      organization_id: organizationId,
      contact_id: contact.id,
      deal_id: deal.id,
      user_id: assignedRep?.id || null,
      type: "lead_ingested",
      title: "Lead Ingested via Webhook",
      description: payload.notes || `Inbound lead from ${payload.source}`,
      metadata: {
        leadScore: scoreResult.score,
        scoringReasons: scoreResult.reasons,
        source: payload.source,
        externalId: payload.externalId,
        rawHeaders: {
          requestId: request.requestId,
          timestamp,
        },
      },
    });

    // Record Audit Log
    await recordAuditEvent(
      {
        organizationId,
        actorUserId: null,
        action: "lead_ingested_via_webhook",
        entityType: "contact",
        entityId: contact.id,
        metadata: {
          contactId: contact.id,
          dealId: deal.id,
          assignedTo: assignedRep?.id,
          idempotencyKey,
        },
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        requestId: request.requestId,
      },
      tx
    );

    // Update Webhook Event state to processed
    await tx
      .update(schema.webhook_events)
      .set({
        status: "processed",
        response_code: 201,
        processed_at: new Date(),
      })
      .where(
        and(
          eq(schema.webhook_events.organization_id, organizationId),
          eq(schema.webhook_events.idempotency_key, idempotencyKey)
        )
      );

    // Update API Key last used timestamp
    await tx
      .update(schema.api_keys)
      .set({
        last_used_at: new Date(),
      })
      .where(eq(schema.api_keys.id, apiKeyRecord.id));

    return {
      success: true,
      isDuplicate: false,
      contactId: contact.id,
      dealId: deal.id,
      assignedRep: assignedRep
        ? {
            id: assignedRep.id,
            name: assignedRep.full_name,
            email: assignedRep.email,
          }
        : null,
      leadScore: scoreResult.score,
      message: "Lead processed and assigned atomically.",
    };
  });
}
