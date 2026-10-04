import { db, schema } from "@/lib/db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { AuthContext, canViewAuditLogs } from "@/lib/authorization";
import { ForbiddenError } from "@/lib/errors";

export interface AuditEventInput {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Append-only audit log recording.
 * Never allows editing or deleting historical logs.
 */
export async function recordAuditEvent(
  event: AuditEventInput,
  tx?: any
): Promise<void> {
  const executor = tx || db;
  await executor.insert(schema.audit_logs).values({
    organization_id: event.organizationId,
    actor_user_id: event.actorUserId || null,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId || null,
    metadata: event.metadata || null,
    ip_address: event.ipAddress || null,
    user_agent: event.userAgent || null,
    request_id: event.requestId || null,
  });
}

/**
 * Fetch audit logs scoped to the authorized tenant (Owner/Admin only).
 */
export async function getAuditLogs(
  context: AuthContext,
  params: AuditFilterParams = {}
) {
  if (!canViewAuditLogs(context)) {
    throw new ForbiddenError("Insufficient permissions to view audit trail.");
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const offset = (page - 1) * limit;

  const conditions = [eq(schema.audit_logs.organization_id, context.organizationId)];

  if (params.entityType) {
    conditions.push(eq(schema.audit_logs.entity_type, params.entityType));
  }
  if (params.action) {
    conditions.push(eq(schema.audit_logs.action, params.action));
  }
  if (params.startDate) {
    conditions.push(gte(schema.audit_logs.created_at, new Date(params.startDate)));
  }
  if (params.endDate) {
    conditions.push(lte(schema.audit_logs.created_at, new Date(params.endDate)));
  }

  const logs = await db
    .select()
    .from(schema.audit_logs)
    .where(and(...conditions))
    .orderBy(desc(schema.audit_logs.created_at))
    .limit(limit)
    .offset(offset);

  return {
    data: logs,
    page,
    limit,
  };
}
