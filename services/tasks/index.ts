import { db, schema } from "@/lib/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { AuthContext } from "@/lib/authorization";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAuditEvent } from "@/services/audit";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  assigned_to_id?: string | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high";
}

export async function getTasks(context: AuthContext) {
  return await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      due_date: schema.tasks.due_date,
      priority: schema.tasks.priority,
      status: schema.tasks.status,
      created_at: schema.tasks.created_at,
      completed_at: schema.tasks.completed_at,
      contact: {
        id: schema.contacts.id,
        name: schema.contacts.name,
      },
      deal: {
        id: schema.deals.id,
        title: schema.deals.title,
      },
      assigned_to: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
      },
    })
    .from(schema.tasks)
    .leftJoin(schema.contacts, eq(schema.tasks.contact_id, schema.contacts.id))
    .leftJoin(schema.deals, eq(schema.tasks.deal_id, schema.deals.id))
    .leftJoin(
      schema.profiles,
      eq(schema.tasks.assigned_to_id, schema.profiles.id)
    )
    .where(eq(schema.tasks.organization_id, context.organizationId))
    .orderBy(asc(schema.tasks.due_date));
}

export async function createTask(context: AuthContext, data: CreateTaskInput) {
  if (context.role === "viewer") {
    throw new ForbiddenError("Viewers cannot create tasks.");
  }

  const [task] = await db
    .insert(schema.tasks)
    .values({
      organization_id: context.organizationId,
      contact_id: data.contact_id || null,
      deal_id: data.deal_id || null,
      assigned_to_id: data.assigned_to_id || context.userId,
      title: data.title,
      description: data.description || null,
      due_date: data.due_date ? new Date(data.due_date) : null,
      priority: data.priority || "medium",
      status: "pending",
      created_by: context.userId,
    })
    .returning();

  // Create Activity
  await db.insert(schema.activities).values({
    organization_id: context.organizationId,
    contact_id: data.contact_id || null,
    deal_id: data.deal_id || null,
    user_id: context.userId,
    type: "task_created",
    title: `Task Created: ${task.title}`,
    description: task.description,
  });

  return task;
}

export async function updateTaskStatus(
  context: AuthContext,
  taskId: string,
  status: "pending" | "in_progress" | "completed" | "cancelled"
) {
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.organization_id, context.organizationId)
      )
    )
    .limit(1);

  if (!task) {
    throw new NotFoundError("Task");
  }

  const completedAt = status === "completed" ? new Date() : null;

  const [updated] = await db
    .update(schema.tasks)
    .set({
      status,
      completed_at: completedAt,
    })
    .where(
      and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.organization_id, context.organizationId)
      )
    )
    .returning();

  return updated;
}
