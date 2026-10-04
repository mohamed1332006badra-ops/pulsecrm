"use server";

import { getAuthContext } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { createTask, updateTaskStatus } from "@/services/tasks";
import { createTaskSchema, updateTaskStatusSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createTaskAction(rawInput: unknown) {
  try {
    const context = await getAuthContext();
    const validated = createTaskSchema.parse(rawInput);

    const task = await createTask(context, {
      title: validated.title,
      description: validated.description,
      contact_id: validated.contact_id,
      deal_id: validated.deal_id,
      assigned_to_id: validated.assigned_to_id,
      due_date: validated.due_date,
      priority: validated.priority,
    });

    if (validated.contact_id) {
      revalidatePath(`/contacts/${validated.contact_id}`);
    }
    revalidatePath("/");
    return { success: true, task };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}

export async function updateTaskStatusAction(taskId: string, rawInput: unknown) {
  try {
    const context = await getAuthContext();
    const validated = updateTaskStatusSchema.parse(rawInput);

    const task = await updateTaskStatus(context, taskId, validated.status);

    revalidatePath("/");
    return { success: true, task };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task status",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}
