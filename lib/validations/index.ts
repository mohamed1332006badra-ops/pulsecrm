import { z } from "zod";

// Contact Validations
export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  company_name: z.string().max(100).optional().or(z.literal("")),
  status: z
    .enum(["new", "contacted", "qualified", "customer", "unqualified"])
    .default("new"),
  source: z.string().default("manual"),
  assigned_to_id: z.string().uuid().optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  lead_score: z.number().int().min(0).max(100).optional(),
});

// Deal Validations
export const createDealSchema = z.object({
  title: z.string().min(1, "Deal title is required").max(150),
  contact_id: z.string().uuid("Valid contact ID required"),
  pipeline_stage_id: z.string().uuid("Valid pipeline stage ID required"),
  value: z.coerce.number().min(0, "Value must be positive").default(0),
  currency: z.string().length(3).default("USD"),
  assigned_to_id: z.string().uuid().optional().nullable(),
  expected_close_date: z.string().datetime().optional().nullable(),
});

export const updateDealSchema = createDealSchema.partial().extend({
  pipeline_stage_id: z.string().uuid().optional(),
});

export const moveDealSchema = z.object({
  deal_id: z.string().uuid(),
  pipeline_stage_id: z.string().uuid(),
  expected_version: z.string().datetime().optional(), // For optimistic concurrency check
});

// Task Validations
export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  assigned_to_id: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
});

// Activity Validation
export const createActivitySchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  deal_id: z.string().uuid().optional().nullable(),
  type: z.enum([
    "call",
    "meeting",
    "note",
    "email",
    "stage_change",
    "task_created",
    "lead_ingested",
    "ai_analysis",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().optional().or(z.literal("")),
  metadata: z.record(z.unknown()).optional(),
});

// Webhook Ingestion Payload Validation (External untrusted data)
export const webhookLeadPayloadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(3, "Phone number is required").max(30),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  companyName: z.string().max(100).optional().or(z.literal("")),
  dealTitle: z.string().max(150).optional().or(z.literal("")),
  estimatedValue: z.coerce.number().min(0).optional().default(0),
  currency: z.string().length(3).optional().default("USD"),
  source: z.string().max(50).optional().default("webhook"),
  externalId: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type WebhookLeadPayload = z.infer<typeof webhookLeadPayloadSchema>;

// API Key Creation Validation
export const createApiKeySchema = z.object({
  name: z.string().min(1, "Key name is required").max(50),
  expires_in_days: z.coerce.number().int().min(1).max(365).optional().default(90),
});

// Pagination and Query Validation
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional().default(""),
  status: z.string().optional(),
  sortBy: z.string().optional().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// AI Copilot Output Schema
export const aiAnalysisOutputSchema = z.object({
  summary: z.string().describe("Executive summary of interaction"),
  sentiment: z
    .enum(["positive", "neutral", "hesitant", "negative"])
    .describe("Client sentiment analysis"),
  urgencyLevel: z
    .enum(["low", "medium", "high"])
    .describe("Deal or follow-up urgency"),
  actionItems: z
    .array(
      z.object({
        task: z.string().describe("Clear actionable task"),
        priority: z.enum(["low", "medium", "high"]),
        dueInDays: z.number().int().min(1).max(30),
      })
    )
    .describe("Suggested tasks for the sales rep"),
  keyObjections: z
    .array(z.string())
    .describe("Potential roadblocks or objections raised by customer"),
});

export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;
