"use server";

import { getAuthContext } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  createContact,
  updateContact,
  deleteContact,
  exportContactsCsv,
} from "@/services/contacts";
import {
  createContactSchema,
  updateContactSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createContactAction(rawInput: unknown) {
  try {
    const context = await getAuthContext();
    const validated = createContactSchema.parse(rawInput);

    const contact = await createContact(context, {
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      company_name: validated.company_name,
      status: validated.status,
      source: validated.source,
      assigned_to_id: validated.assigned_to_id,
    });

    revalidatePath("/contacts");
    revalidatePath("/");
    return { success: true, contact };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Operation failed",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}

export async function updateContactAction(contactId: string, rawInput: unknown) {
  try {
    const context = await getAuthContext();
    const validated = updateContactSchema.parse(rawInput);

    const contact = await updateContact(context, contactId, {
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      company_name: validated.company_name,
      status: validated.status,
      source: validated.source,
      assigned_to_id: validated.assigned_to_id,
    });

    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/contacts");
    return { success: true, contact };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update contact",
      code: error.code || "INTERNAL_ERROR",
    };
  }
}

export async function deleteContactAction(contactId: string) {
  try {
    const context = await getAuthContext();
    await deleteContact(context, contactId);

    revalidatePath("/contacts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete contact",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}

export async function exportContactsAction() {
  try {
    const context = await getAuthContext();
    const csvContent = await exportContactsCsv(context);

    return { success: true, csvContent };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export contacts",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}
