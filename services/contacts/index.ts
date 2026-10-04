import { db, schema } from "@/lib/db";
import { eq, and, or, ilike, desc, asc, sql, count } from "drizzle-orm";
import {
  AuthContext,
  canCreateContact,
  canEditContact,
  canDeleteContact,
  canExportData,
} from "@/lib/authorization";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { calculateLeadScore } from "@/services/lead-scoring";
import { recordAuditEvent } from "@/services/audit";

export interface ContactFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: "created_at" | "name" | "lead_score";
  sortOrder?: "asc" | "desc";
}

export interface CreateContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  status?: "new" | "contacted" | "qualified" | "customer" | "unqualified";
  source?: string;
  assigned_to_id?: string | null;
}

export interface UpdateContactInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  status?: "new" | "contacted" | "qualified" | "customer" | "unqualified";
  source?: string;
  assigned_to_id?: string | null;
}

/**
 * List tenant contacts with server-side pagination, search, and filtering.
 */
export async function getContacts(
  context: AuthContext,
  filters: ContactFilters = {}
) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = [eq(schema.contacts.organization_id, context.organizationId)];

  if (filters.status) {
    conditions.push(eq(schema.contacts.status, filters.status as any));
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.contacts.name, term),
        ilike(schema.contacts.email, term),
        ilike(schema.contacts.company_name, term),
        ilike(schema.contacts.phone, term)
      )!
    );
  }

  // Count total matching
  const [totalResult] = await db
    .select({ total: count() })
    .from(schema.contacts)
    .where(and(...conditions));

  const total = Number(totalResult?.total || 0);

  // Sorting
  const sortCol =
    filters.sortBy === "name"
      ? schema.contacts.name
      : filters.sortBy === "lead_score"
      ? schema.contacts.lead_score
      : schema.contacts.created_at;

  const orderExpr = filters.sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

  // Query records with assigned profile info
  const items = await db
    .select({
      id: schema.contacts.id,
      organization_id: schema.contacts.organization_id,
      name: schema.contacts.name,
      email: schema.contacts.email,
      phone: schema.contacts.phone,
      company_name: schema.contacts.company_name,
      status: schema.contacts.status,
      lead_score: schema.contacts.lead_score,
      source: schema.contacts.source,
      external_id: schema.contacts.external_id,
      created_at: schema.contacts.created_at,
      updated_at: schema.contacts.updated_at,
      assigned_to: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
        email: schema.profiles.email,
        avatar_url: schema.profiles.avatar_url,
      },
    })
    .from(schema.contacts)
    .leftJoin(
      schema.profiles,
      eq(schema.contacts.assigned_to_id, schema.profiles.id)
    )
    .where(and(...conditions))
    .orderBy(orderExpr)
    .limit(limit)
    .offset(offset);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Fetch a single contact with Customer 360 context:
 * Contact info, deals, activities timeline, and tasks.
 */
export async function getContactById(context: AuthContext, contactId: string) {
  const [contact] = await db
    .select({
      id: schema.contacts.id,
      organization_id: schema.contacts.organization_id,
      assigned_to_id: schema.contacts.assigned_to_id,
      name: schema.contacts.name,
      email: schema.contacts.email,
      phone: schema.contacts.phone,
      company_name: schema.contacts.company_name,
      status: schema.contacts.status,
      lead_score: schema.contacts.lead_score,
      source: schema.contacts.source,
      external_id: schema.contacts.external_id,
      created_at: schema.contacts.created_at,
      updated_at: schema.contacts.updated_at,
      assigned_to: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
        email: schema.profiles.email,
        avatar_url: schema.profiles.avatar_url,
      },
    })
    .from(schema.contacts)
    .leftJoin(
      schema.profiles,
      eq(schema.contacts.assigned_to_id, schema.profiles.id)
    )
    .where(
      and(
        eq(schema.contacts.id, contactId),
        eq(schema.contacts.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!contact) {
    throw new NotFoundError("Contact");
  }

  // Fetch associated deals
  const deals = await db
    .select({
      id: schema.deals.id,
      title: schema.deals.title,
      value: schema.deals.value,
      currency: schema.deals.currency,
      expected_close_date: schema.deals.expected_close_date,
      created_at: schema.deals.created_at,
      stage: {
        id: schema.pipeline_stages.id,
        name: schema.pipeline_stages.name,
        key: schema.pipeline_stages.key,
        is_won: schema.pipeline_stages.is_won,
        is_lost: schema.pipeline_stages.is_lost,
      },
    })
    .from(schema.deals)
    .leftJoin(
      schema.pipeline_stages,
      eq(schema.deals.pipeline_stage_id, schema.pipeline_stages.id)
    )
    .where(
      and(
        eq(schema.deals.contact_id, contactId),
        eq(schema.deals.organization_id, context.organizationId)
      )
    )
    .orderBy(desc(schema.deals.created_at));

  // Fetch chronological activities timeline
  const activities = await db
    .select({
      id: schema.activities.id,
      type: schema.activities.type,
      title: schema.activities.title,
      description: schema.activities.description,
      metadata: schema.activities.metadata,
      created_at: schema.activities.created_at,
      user: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
      },
    })
    .from(schema.activities)
    .leftJoin(schema.profiles, eq(schema.activities.user_id, schema.profiles.id))
    .where(
      and(
        eq(schema.activities.contact_id, contactId),
        eq(schema.activities.organization_id, context.organizationId)
      )
    )
    .orderBy(desc(schema.activities.created_at));

  // Fetch tasks
  const tasks = await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      due_date: schema.tasks.due_date,
      priority: schema.tasks.priority,
      status: schema.tasks.status,
      created_at: schema.tasks.created_at,
      assigned_to: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
      },
    })
    .from(schema.tasks)
    .leftJoin(schema.profiles, eq(schema.tasks.assigned_to_id, schema.profiles.id))
    .where(
      and(
        eq(schema.tasks.contact_id, contactId),
        eq(schema.tasks.organization_id, context.organizationId)
      )
    )
    .orderBy(asc(schema.tasks.due_date));

  // Re-calculate lead score explainability breakdown
  const scoringBreakdown = calculateLeadScore({
    email: contact.email,
    phone: contact.phone,
    companyName: contact.company_name,
    estimatedValue: deals.reduce((sum, d) => sum + Number(d.value || 0), 0),
    source: contact.source,
  });

  return {
    contact,
    deals,
    activities,
    tasks,
    scoringBreakdown,
  };
}

/**
 * Create a new contact with strict RBAC, automated scoring, and audit logging.
 */
export async function createContact(
  context: AuthContext,
  data: CreateContactInput
) {
  if (!canCreateContact(context)) {
    throw new ForbiddenError("Insufficient permissions to create contacts.");
  }

  const scoreResult = calculateLeadScore({
    email: data.email,
    phone: data.phone,
    companyName: data.company_name,
    source: data.source,
  });

  const [contact] = await db
    .insert(schema.contacts)
    .values({
      organization_id: context.organizationId,
      assigned_to_id: data.assigned_to_id || context.userId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      company_name: data.company_name || null,
      status: data.status || "new",
      lead_score: scoreResult.score,
      source: data.source || "manual",
    })
    .returning();

  // Record activity
  await db.insert(schema.activities).values({
    organization_id: context.organizationId,
    contact_id: contact.id,
    user_id: context.userId,
    type: "note",
    title: "Contact Created",
    description: `Contact ${contact.name} created manually.`,
    metadata: { leadScore: scoreResult.score },
  });

  // Record audit log
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "contact_created",
    entityType: "contact",
    entityId: contact.id,
    metadata: { name: contact.name, email: contact.email },
  });

  return contact;
}

/**
 * Update an existing contact with mass assignment protection and RBAC checks.
 */
export async function updateContact(
  context: AuthContext,
  contactId: string,
  data: UpdateContactInput
) {
  const [existing] = await db
    .select()
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.id, contactId),
        eq(schema.contacts.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Contact");
  }

  if (!canEditContact(context, existing)) {
    throw new ForbiddenError("Insufficient permissions to update this contact.");
  }

  const updateFields: Partial<typeof schema.contacts.$inferInsert> = {
    updated_at: new Date(),
  };

  if (data.name !== undefined) updateFields.name = data.name;
  if (data.email !== undefined) updateFields.email = data.email || null;
  if (data.phone !== undefined) updateFields.phone = data.phone || null;
  if (data.company_name !== undefined)
    updateFields.company_name = data.company_name || null;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.source !== undefined) updateFields.source = data.source;
  if (data.assigned_to_id !== undefined)
    updateFields.assigned_to_id = data.assigned_to_id || null;

  // Re-calculate lead score if relevant contact attributes changed
  const scoreResult = calculateLeadScore({
    email: updateFields.email ?? existing.email,
    phone: updateFields.phone ?? existing.phone,
    companyName: updateFields.company_name ?? existing.company_name,
    source: updateFields.source ?? existing.source,
  });
  updateFields.lead_score = scoreResult.score;

  const [updated] = await db
    .update(schema.contacts)
    .set(updateFields)
    .where(
      and(
        eq(schema.contacts.id, contactId),
        eq(schema.contacts.organization_id, context.organizationId)
      )
    )
    .returning();

  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "contact_updated",
    entityType: "contact",
    entityId: contactId,
    metadata: { changedFields: Object.keys(data) },
  });

  return updated;
}

/**
 * Delete a contact (Owner/Admin only).
 */
export async function deleteContact(context: AuthContext, contactId: string) {
  const [existing] = await db
    .select()
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.id, contactId),
        eq(schema.contacts.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Contact");
  }

  if (!canDeleteContact(context, existing)) {
    throw new ForbiddenError("Insufficient permissions to delete contacts.");
  }

  await db
    .delete(schema.contacts)
    .where(
      and(
        eq(schema.contacts.id, contactId),
        eq(schema.contacts.organization_id, context.organizationId)
      )
    );

  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "contact_deleted",
    entityType: "contact",
    entityId: contactId,
    metadata: { name: existing.name },
  });

  return { success: true };
}

/**
 * Controlled CSV export of tenant contacts.
 * Enforces role restriction and writes to audit log.
 */
export async function exportContactsCsv(context: AuthContext): Promise<string> {
  if (!canExportData(context)) {
    throw new ForbiddenError("Insufficient permissions to export contact data.");
  }

  const contacts = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.organization_id, context.organizationId))
    .orderBy(desc(schema.contacts.created_at));

  // Build CSV with safe escaping
  const headers = [
    "ID",
    "Name",
    "Email",
    "Phone",
    "Company",
    "Status",
    "Lead Score",
    "Source",
    "Created At",
  ];

  const rows = contacts.map((c) => [
    c.id,
    `"${(c.name || "").replace(/"/g, '""')}"`,
    `"${(c.email || "").replace(/"/g, '""')}"`,
    `"${(c.phone || "").replace(/"/g, '""')}"`,
    `"${(c.company_name || "").replace(/"/g, '""')}"`,
    c.status,
    c.lead_score,
    `"${(c.source || "").replace(/"/g, '""')}"`,
    c.created_at.toISOString(),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "contacts_exported",
    entityType: "contact",
    metadata: { rowCount: contacts.length },
  });

  return csvContent;
}
