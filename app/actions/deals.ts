"use server";

import { getAuthContext } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  createDeal,
  moveDealStage,
  deleteDeal,
} from "@/services/deals";
import {
  createDealSchema,
  moveDealSchema,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createDealAction(rawInput: unknown) {
  try {
    const context = await getAuthContext();
    const validated = createDealSchema.parse(rawInput);

    const deal = await createDeal(context, {
      title: validated.title,
      contact_id: validated.contact_id,
      pipeline_stage_id: validated.pipeline_stage_id,
      value: validated.value,
      currency: validated.currency,
      assigned_to_id: validated.assigned_to_id,
      expected_close_date: validated.expected_close_date,
    });

    revalidatePath("/deals");
    revalidatePath("/");
    return { success: true, deal };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create deal",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}

export async function moveDealStageAction(rawInput: unknown) {
  try {
    const context = await getAuthContext();
    const validated = moveDealSchema.parse(rawInput);

    const deal = await moveDealStage(
      context,
      validated.deal_id,
      validated.pipeline_stage_id,
      validated.expected_version
    );

    revalidatePath("/deals");
    revalidatePath("/");
    return { success: true, deal };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update deal stage",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}

export async function deleteDealAction(dealId: string) {
  try {
    const context = await getAuthContext();
    await deleteDeal(context, dealId);

    revalidatePath("/deals");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete deal",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}
