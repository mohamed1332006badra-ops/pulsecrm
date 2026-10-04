"use server";

import { getAuthContext } from "@/lib/auth";
import { canManageApiKeys } from "@/lib/authorization";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { generateApiKey } from "@/lib/security";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { recordAuditEvent } from "@/services/audit";
import { revalidatePath } from "next/cache";

export async function createApiKeyAction(name: string, expiresInDays = 90) {
  try {
    const context = await getAuthContext();
    if (!canManageApiKeys(context)) {
      throw new ForbiddenError("Insufficient permissions to manage API keys.");
    }

    if (!name || name.trim().length === 0) {
      throw new Error("Key name is required.");
    }

    const { rawSecret, keyPrefix, keyHash } = generateApiKey();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 3600 * 1000);

    const [apiKey] = await db
      .insert(schema.api_keys)
      .values({
        organization_id: context.organizationId,
        name: name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        created_by: context.userId,
        expires_at: expiresAt,
      })
      .returning();

    await recordAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "api_key_created",
      entityType: "api_key",
      entityId: apiKey.id,
      metadata: { name: apiKey.name, prefix: keyPrefix },
    });

    revalidatePath("/settings/security");

    // Only return the rawSecret ONCE at creation!
    return {
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.key_prefix,
        rawSecret, // Revealed only once to user
        expiresAt: apiKey.expires_at,
      },
    };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create API key",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}

export async function revokeApiKeyAction(keyId: string) {
  try {
    const context = await getAuthContext();
    if (!canManageApiKeys(context)) {
      throw new ForbiddenError("Insufficient permissions to revoke API keys.");
    }

    const [existing] = await db
      .select()
      .from(schema.api_keys)
      .where(
        and(
          eq(schema.api_keys.id, keyId),
          eq(schema.api_keys.organization_id, context.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("API key");
    }

    await db
      .update(schema.api_keys)
      .set({ revoked_at: new Date() })
      .where(
        and(
          eq(schema.api_keys.id, keyId),
          eq(schema.api_keys.organization_id, context.organizationId)
        )
      );

    await recordAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action: "api_key_revoked",
      entityType: "api_key",
      entityId: keyId,
      metadata: { name: existing.name },
    });

    revalidatePath("/settings/security");
    return { success: true };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke API key",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}
