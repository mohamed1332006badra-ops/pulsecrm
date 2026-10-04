import { db, schema } from "@/lib/db";
import { AuthContext, canTriggerAiAnalysis } from "@/lib/authorization";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import {
  aiAnalysisOutputSchema,
  AiAnalysisOutput,
} from "@/lib/validations";
import { getContactById } from "@/services/contacts";
import { recordAuditEvent } from "@/services/audit";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export interface AnalyzeInteractionParams {
  contactId: string;
  notes: string;
  interactionType?: "meeting" | "call" | "email" | "note";
  requestId?: string;
}

export interface AiAnalysisResult {
  data: AiAnalysisOutput;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  requestId?: string;
}

/**
 * AI Sales Copilot Analysis Service
 * 
 * Ingests user notes with authorized tenant contact & deal context.
 * Performs structured analysis adhering strictly to `aiAnalysisOutputSchema`.
 * Tracks token usage in `ai_usage` table.
 * Never directly mutates CRM data without user approval.
 */
export async function analyzeSalesInteraction(
  context: AuthContext,
  params: AnalyzeInteractionParams
): Promise<AiAnalysisResult> {
  if (!canTriggerAiAnalysis(context)) {
    throw new ForbiddenError("Insufficient permissions to use AI Sales Copilot.");
  }

  if (!params.notes || params.notes.trim().length < 5) {
    throw new ValidationError("Interaction notes must contain at least 5 characters.");
  }

  // 1. Fetch authorized tenant context (strictly isolated to user's organization)
  const contactDetails = await getContactById(context, params.contactId);
  const { contact, deals, activities } = contactDetails;

  const contextSummary = `
CRM Contact Context:
- Name: ${contact.name}
- Company: ${contact.company_name || "N/A"}
- Status: ${contact.status}
- Lead Score: ${contact.lead_score}
- Active Deals: ${deals.map((d) => `${d.title} (${d.currency} ${d.value}, Stage: ${d.stage?.name})`).join("; ") || "None"}
- Recent Activities (${activities.length}): ${activities.slice(0, 3).map((a) => `${a.type}: ${a.title}`).join("; ") || "None"}
`;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const configuredModel = process.env.AI_MODEL || "gemini-1.5-flash";

  let resultData: AiAnalysisOutput;
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCost = 0;
  const provider = "google-generative-ai";

  if (apiKey && apiKey !== "your-google-ai-api-key") {
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const prompt = `
You are an expert enterprise B2B sales copilot for PulseCRM.
Analyze the following sales interaction notes in the context of the customer history.

${contextSummary}

Interaction Type: ${params.interactionType || "meeting"}
Sales Representative's Notes:
"""
${params.notes}
"""

Instructions:
1. Provide an executive summary of the discussion.
2. Determine customer sentiment: positive, neutral, hesitant, or negative.
3. Assess urgency level: low, medium, or high.
4. Extract 1-3 specific, actionable follow-up tasks with reasonable deadlines (dueInDays: 1-14).
5. Identify any key objections or roadblocks mentioned or implied.
`;

      const response = await generateObject({
        model: google(configuredModel),
        schema: aiAnalysisOutputSchema,
        prompt,
      });

      resultData = response.object;
      inputTokens = response.usage?.promptTokens || Math.round(prompt.length / 4);
      outputTokens = response.usage?.completionTokens || Math.round(JSON.stringify(resultData).length / 4);
      // Gemini 1.5 Flash approx cost: $0.075 / 1M prompt, $0.30 / 1M completion
      estimatedCost = (inputTokens * 0.000000075) + (outputTokens * 0.0000003);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("AI Provider call failed or unavailable, falling back to heuristic copilot analyzer:", errMsg);
      resultData = fallbackHeuristicAnalysis(params.notes, contact.name);
    }
  } else {
    // Deterministic rule-based NLP fallback when API key is not configured
    resultData = fallbackHeuristicAnalysis(params.notes, contact.name);
    inputTokens = Math.round(params.notes.length / 4);
    outputTokens = Math.round(JSON.stringify(resultData).length / 4);
  }

  // 2. Track AI usage in database
  await db.insert(schema.ai_usage).values({
    organization_id: context.organizationId,
    user_id: context.userId,
    provider,
    model: configuredModel,
    operation: "analyze_sales_interaction",
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: String(estimatedCost.toFixed(6)),
    request_id: params.requestId || null,
  });

  // 3. Record audit event
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "ai_analysis_performed",
    entityType: "contact",
    entityId: contact.id,
    metadata: {
      sentiment: resultData.sentiment,
      urgency: resultData.urgencyLevel,
      actionItemCount: resultData.actionItems.length,
    },
    requestId: params.requestId,
  });

  return {
    data: resultData,
    model: configuredModel,
    provider,
    inputTokens,
    outputTokens,
    estimatedCost,
    requestId: params.requestId,
  };
}

/**
 * Deterministic fallback analysis engine for environments where the external AI key is absent.
 */
function fallbackHeuristicAnalysis(notes: string, contactName: string): AiAnalysisOutput {
  const lower = notes.toLowerCase();

  let sentiment: AiAnalysisOutput["sentiment"] = "neutral";
  if (lower.includes("excited") || lower.includes("great") || lower.includes("agreed") || lower.includes("interested") || lower.includes("approved")) {
    sentiment = "positive";
  } else if (lower.includes("hesitant") || lower.includes("concerned") || lower.includes("delay") || lower.includes("expensive") || lower.includes("budget")) {
    sentiment = "hesitant";
  } else if (lower.includes("cancel") || lower.includes("rejected") || lower.includes("no longer") || lower.includes("unhappy")) {
    sentiment = "negative";
  }

  let urgencyLevel: AiAnalysisOutput["urgencyLevel"] = "medium";
  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("immediately") || lower.includes("tomorrow") || lower.includes("this week")) {
    urgencyLevel = "high";
  } else if (lower.includes("next quarter") || lower.includes("no rush") || lower.includes("later")) {
    urgencyLevel = "low";
  }

  const actionItems: AiAnalysisOutput["actionItems"] = [
    {
      task: `Send follow-up recap and proposal to ${contactName}`,
      priority: urgencyLevel === "high" ? "high" : "medium",
      dueInDays: urgencyLevel === "high" ? 1 : 3,
    },
  ];

  if (lower.includes("demo") || lower.includes("presentation")) {
    actionItems.push({
      task: "Prepare tailored product demonstration highlighting enterprise security",
      priority: "high",
      dueInDays: 2,
    });
  }

  const keyObjections: string[] = [];
  if (lower.includes("price") || lower.includes("cost") || lower.includes("budget") || lower.includes("expensive")) {
    keyObjections.push("Pricing & budget allocation constraints");
  }
  if (lower.includes("competitor") || lower.includes("already using")) {
    keyObjections.push("Incumbent competitor evaluation");
  }
  if (lower.includes("security") || lower.includes("compliance") || lower.includes("soc2")) {
    keyObjections.push("Security review and compliance documentation needed");
  }

  return {
    summary: `Interaction with ${contactName}: discussed requirements and next steps. Key focus on timeline and deliverables.`,
    sentiment,
    urgencyLevel,
    actionItems,
    keyObjections,
  };
}
