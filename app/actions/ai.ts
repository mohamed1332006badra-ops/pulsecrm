"use server";

import { getAuthContext } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { analyzeSalesInteraction } from "@/services/ai";
import { generateRequestId } from "@/lib/observability";

export async function analyzeInteractionAction(
  contactId: string,
  notes: string,
  interactionType?: "meeting" | "call" | "email" | "note"
) {
  try {
    const context = await getAuthContext();
    const requestId = generateRequestId();

    const analysis = await analyzeSalesInteraction(context, {
      contactId,
      notes,
      interactionType,
      requestId,
    });

    return { success: true, analysis: analysis.data };
  } catch (error) {
    const appError = error instanceof AppError ? error : null;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze interaction with AI Copilot",
      code: appError?.code ?? "INTERNAL_ERROR",
    };
  }
}
