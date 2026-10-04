import { db, schema } from "@/lib/db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  AuthContext,
  canCreateDeal,
  canEditDeal,
  canMoveDeal,
  canDeleteDeal,
} from "@/lib/authorization";
import {
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TenantAccessDeniedError,
} from "@/lib/errors";
import { recordAuditEvent } from "@/services/audit";

export interface CreateDealInput {
  title: string;
  contact_id: string;
  pipeline_stage_id: string;
  value: number;
  currency?: string;
  assigned_to_id?: string | null;
  expected_close_date?: string | null;
}

export interface UpdateDealInput {
  title?: string;
  value?: number;
  currency?: string;
  assigned_to_id?: string | null;
  expected_close_date?: string | null;
  pipeline_stage_id?: string;
}

/**
 * Fetch all deals for Kanban pipeline grouped by pipeline stages.
 */
export async function getDealsGroupedByStage(context: AuthContext) {
  // Fetch all pipeline stages for the organization ordered by position
  const stages = await db
    .select()
    .from(schema.pipeline_stages)
    .where(eq(schema.pipeline_stages.organization_id, context.organizationId))
    .orderBy(asc(schema.pipeline_stages.position));

  // Fetch all deals with contact and assigned user info
  const deals = await db
    .select({
      id: schema.deals.id,
      organization_id: schema.deals.organization_id,
      contact_id: schema.deals.contact_id,
      assigned_to_id: schema.deals.assigned_to_id,
      pipeline_stage_id: schema.deals.pipeline_stage_id,
      title: schema.deals.title,
      value: schema.deals.value,
      currency: schema.deals.currency,
      expected_close_date: schema.deals.expected_close_date,
      created_at: schema.deals.created_at,
      updated_at: schema.deals.updated_at,
      contact: {
        id: schema.contacts.id,
        name: schema.contacts.name,
        company_name: schema.contacts.company_name,
        lead_score: schema.contacts.lead_score,
      },
      assigned_to: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
        avatar_url: schema.profiles.avatar_url,
      },
    })
    .from(schema.deals)
    .leftJoin(schema.contacts, eq(schema.deals.contact_id, schema.contacts.id))
    .leftJoin(
      schema.profiles,
      eq(schema.deals.assigned_to_id, schema.profiles.id)
    )
    .where(eq(schema.deals.organization_id, context.organizationId))
    .orderBy(desc(schema.deals.updated_at));

  // Group deals by stage
  const columns = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.pipeline_stage_id === stage.id);
    const totalValue = stageDeals.reduce(
      (sum, d) => sum + parseFloat(d.value || "0"),
      0
    );

    return {
      stage,
      deals: stageDeals,
      dealCount: stageDeals.length,
      totalValue,
    };
  });

  return { stages, columns };
}

/**
 * Fetch a single deal by ID with tenant verification.
 */
export async function getDealById(context: AuthContext, dealId: string) {
  const [deal] = await db
    .select({
      id: schema.deals.id,
      organization_id: schema.deals.organization_id,
      contact_id: schema.deals.contact_id,
      assigned_to_id: schema.deals.assigned_to_id,
      pipeline_stage_id: schema.deals.pipeline_stage_id,
      title: schema.deals.title,
      value: schema.deals.value,
      currency: schema.deals.currency,
      expected_close_date: schema.deals.expected_close_date,
      created_at: schema.deals.created_at,
      updated_at: schema.deals.updated_at,
      contact: {
        id: schema.contacts.id,
        name: schema.contacts.name,
        email: schema.contacts.email,
        phone: schema.contacts.phone,
        company_name: schema.contacts.company_name,
      },
      stage: {
        id: schema.pipeline_stages.id,
        name: schema.pipeline_stages.name,
        key: schema.pipeline_stages.key,
        is_won: schema.pipeline_stages.is_won,
        is_lost: schema.pipeline_stages.is_lost,
      },
      assigned_to: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
        email: schema.profiles.email,
      },
    })
    .from(schema.deals)
    .leftJoin(schema.contacts, eq(schema.deals.contact_id, schema.contacts.id))
    .leftJoin(
      schema.pipeline_stages,
      eq(schema.deals.pipeline_stage_id, schema.pipeline_stages.id)
    )
    .leftJoin(
      schema.profiles,
      eq(schema.deals.assigned_to_id, schema.profiles.id)
    )
    .where(
      and(
        eq(schema.deals.id, dealId),
        eq(schema.deals.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!deal) {
    throw new NotFoundError("Deal");
  }

  return deal;
}

/**
 * Create a deal with tenant validation across relationships (Contact and Stage).
 */
export async function createDeal(context: AuthContext, data: CreateDealInput) {
  if (!canCreateDeal(context)) {
    throw new ForbiddenError("Insufficient permissions to create deals.");
  }

  // Cross-tenant injection check: Contact MUST belong to the user's organization
  const [contact] = await db
    .select({ id: schema.contacts.id, organization_id: schema.contacts.organization_id })
    .from(schema.contacts)
    .where(eq(schema.contacts.id, data.contact_id))
    .limit(1);

  if (!contact || contact.organization_id !== context.organizationId) {
    throw new TenantAccessDeniedError(
      "Cannot associate deal with a contact outside your organization."
    );
  }

  // Stage MUST belong to the user's organization
  const [stage] = await db
    .select({ id: schema.pipeline_stages.id, organization_id: schema.pipeline_stages.organization_id })
    .from(schema.pipeline_stages)
    .where(eq(schema.pipeline_stages.id, data.pipeline_stage_id))
    .limit(1);

  if (!stage || stage.organization_id !== context.organizationId) {
    throw new TenantAccessDeniedError(
      "Cannot assign deal to a stage outside your organization."
    );
  }

  const [deal] = await db
    .insert(schema.deals)
    .values({
      organization_id: context.organizationId,
      contact_id: data.contact_id,
      assigned_to_id: data.assigned_to_id || context.userId,
      pipeline_stage_id: data.pipeline_stage_id,
      title: data.title,
      value: String(data.value || 0),
      currency: data.currency || "USD",
      expected_close_date: data.expected_close_date
        ? new Date(data.expected_close_date)
        : null,
    })
    .returning();

  // Create Activity
  await db.insert(schema.activities).values({
    organization_id: context.organizationId,
    contact_id: data.contact_id,
    deal_id: deal.id,
    user_id: context.userId,
    type: "note",
    title: "Deal Created",
    description: `Deal "${deal.title}" created with value ${deal.currency} ${deal.value}.`,
  });

  // Record Audit Log
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "deal_created",
    entityType: "deal",
    entityId: deal.id,
    metadata: { title: deal.title, value: deal.value, contactId: data.contact_id },
  });

  return deal;
}

/**
 * Move Deal Stage (Drag-and-drop Kanban mutation)
 * Supports optimistic concurrency conflict detection and records stage_change activity.
 */
export async function moveDealStage(
  context: AuthContext,
  dealId: string,
  targetStageId: string,
  expectedVersion?: string
) {
  // 1. Fetch deal
  const [deal] = await db
    .select()
    .from(schema.deals)
    .where(
      and(
        eq(schema.deals.id, dealId),
        eq(schema.deals.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!deal) {
    throw new NotFoundError("Deal");
  }

  // 2. Check authorization
  if (!canMoveDeal(context, deal)) {
    throw new ForbiddenError("Insufficient permissions to move this deal.");
  }

  // 3. Optimistic concurrency check (if expectedVersion timestamp was provided)
  if (expectedVersion) {
    const expectedTime = new Date(expectedVersion).getTime();
    const actualTime = new Date(deal.updated_at).getTime();
    if (Math.abs(expectedTime - actualTime) > 1000) {
      throw new ConflictError(
        "Deal was modified concurrently by another user. Pipeline has been reloaded."
      );
    }
  }

  // 4. Verify target stage belongs to organization
  const [targetStage] = await db
    .select()
    .from(schema.pipeline_stages)
    .where(
      and(
        eq(schema.pipeline_stages.id, targetStageId),
        eq(schema.pipeline_stages.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!targetStage) {
    throw new NotFoundError("Target pipeline stage");
  }

  // If already at target stage, noop
  if (deal.pipeline_stage_id === targetStageId) {
    return deal;
  }

  // Fetch old stage name for activity note
  const [oldStage] = await db
    .select()
    .from(schema.pipeline_stages)
    .where(eq(schema.pipeline_stages.id, deal.pipeline_stage_id))
    .limit(1);

  // 5. Update deal stage
  const [updatedDeal] = await db
    .update(schema.deals)
    .set({
      pipeline_stage_id: targetStageId,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(schema.deals.id, dealId),
        eq(schema.deals.organization_id, context.organizationId)
      )
    )
    .returning();

  // 6. Record stage_change activity
  await db.insert(schema.activities).values({
    organization_id: context.organizationId,
    contact_id: deal.contact_id,
    deal_id: deal.id,
    user_id: context.userId,
    type: "stage_change",
    title: `Stage Changed: ${oldStage?.name || "Previous"} → ${targetStage.name}`,
    description: `Deal moved to stage "${targetStage.name}".`,
    metadata: {
      fromStageId: oldStage?.id,
      toStageId: targetStage.id,
      fromStageName: oldStage?.name,
      toStageName: targetStage.name,
      isWon: targetStage.is_won,
      isLost: targetStage.is_lost,
    },
  });

  // 7. Audit log
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "deal_stage_moved",
    entityType: "deal",
    entityId: dealId,
    metadata: {
      fromStage: oldStage?.name,
      toStage: targetStage.name,
    },
  });

  return updatedDeal;
}

/**
 * Delete a deal (Owner/Admin only).
 */
export async function deleteDeal(context: AuthContext, dealId: string) {
  const [deal] = await db
    .select()
    .from(schema.deals)
    .where(
      and(
        eq(schema.deals.id, dealId),
        eq(schema.deals.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!deal) {
    throw new NotFoundError("Deal");
  }

  if (!canDeleteDeal(context, deal)) {
    throw new ForbiddenError("Insufficient permissions to delete deals.");
  }

  await db
    .delete(schema.deals)
    .where(
      and(
        eq(schema.deals.id, dealId),
        eq(schema.deals.organization_id, context.organizationId)
      )
    );

  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "deal_deleted",
    entityType: "deal",
    entityId: dealId,
    metadata: { title: deal.title },
  });

  return { success: true };
}
