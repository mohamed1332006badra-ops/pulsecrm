import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  bigint,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// 1. ORGANIZATIONS
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("org_slug_idx").on(table.slug),
  })
);

// 2. PROFILES (Users)
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(), // maps to auth.users id
    // Nullable: profiles are created when auth.users is provisioned before org assignment;
    // authoritative multi-tenant organization membership and RBAC roles are tracked in organization_members.
    organization_id: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    full_name: text("full_name").notNull(),
    email: text("email").notNull(),
    role: text("role", {
      enum: ["owner", "admin", "sales_rep", "viewer"],
    })
      .notNull()
      .default("sales_rep"),
    avatar_url: text("avatar_url"),
    last_lead_assigned_at: timestamp("last_lead_assigned_at", {
      withTimezone: true,
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("profiles_org_idx").on(table.organization_id),
    emailIdx: index("profiles_email_idx").on(table.email),
    lastAssignedIdx: index("profiles_last_lead_assigned_idx").on(
      table.organization_id,
      table.last_lead_assigned_at
    ),
  })
);

// 3. ORGANIZATION MEMBERSHIPS
export const organization_members = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").notNull(),
    role: text("role", {
      enum: ["owner", "admin", "sales_rep", "viewer"],
    }).notNull(),
    status: text("status", {
      enum: ["active", "invited", "suspended"],
    })
      .notNull()
      .default("active"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userOrgUniqueIdx: uniqueIndex("org_member_user_org_idx").on(
      table.user_id,
      table.organization_id
    ),
    orgStatusIdx: index("org_member_status_idx").on(
      table.organization_id,
      table.status
    ),
  })
);

// 4. PIPELINE STAGES
export const pipeline_stages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull(),
    position: integer("position").notNull(),
    is_won: boolean("is_won").default(false).notNull(),
    is_lost: boolean("is_lost").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgKeyUniqueIdx: uniqueIndex("pipeline_org_key_idx").on(
      table.organization_id,
      table.key
    ),
    orgPosUniqueIdx: uniqueIndex("pipeline_org_pos_idx").on(
      table.organization_id,
      table.position
    ),
  })
);

// 5. CONTACTS
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    assigned_to_id: uuid("assigned_to_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company_name: text("company_name"),
    status: text("status", {
      enum: ["new", "contacted", "qualified", "customer", "unqualified"],
    })
      .notNull()
      .default("new"),
    lead_score: integer("lead_score").default(0).notNull(),
    source: text("source").default("manual"),
    external_id: text("external_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("contacts_org_idx").on(table.organization_id),
    orgAssignedIdx: index("contacts_org_assigned_idx").on(
      table.organization_id,
      table.assigned_to_id
    ),
    orgEmailIdx: index("contacts_org_email_idx").on(
      table.organization_id,
      table.email
    ),
    orgStatusIdx: index("contacts_org_status_idx").on(
      table.organization_id,
      table.status
    ),
    orgCreatedIdx: index("contacts_org_created_idx").on(
      table.organization_id,
      table.created_at
    ),
  })
);

// 6. DEALS
export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contact_id: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    assigned_to_id: uuid("assigned_to_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    pipeline_stage_id: uuid("pipeline_stage_id")
      .notNull()
      .references(() => pipeline_stages.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    value: numeric("value", { precision: 12, scale: 2 }).default("0").notNull(),
    currency: text("currency").default("USD").notNull(),
    expected_close_date: timestamp("expected_close_date", {
      withTimezone: true,
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("deals_org_idx").on(table.organization_id),
    orgStageIdx: index("deals_org_stage_idx").on(
      table.organization_id,
      table.pipeline_stage_id
    ),
    orgAssignedIdx: index("deals_org_assigned_idx").on(
      table.organization_id,
      table.assigned_to_id
    ),
    orgContactIdx: index("deals_org_contact_idx").on(
      table.organization_id,
      table.contact_id
    ),
  })
);

// 7. ACTIVITIES
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contact_id: uuid("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    deal_id: uuid("deal_id").references(() => deals.id, {
      onDelete: "cascade",
    }),
    user_id: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    type: text("type", {
      enum: [
        "call",
        "meeting",
        "note",
        "email",
        "stage_change",
        "task_created",
        "lead_ingested",
        "ai_analysis",
      ],
    }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgContactIdx: index("activities_org_contact_idx").on(
      table.organization_id,
      table.contact_id
    ),
    orgDealIdx: index("activities_org_deal_idx").on(
      table.organization_id,
      table.deal_id
    ),
    orgCreatedIdx: index("activities_org_created_idx").on(
      table.organization_id,
      table.created_at
    ),
  })
);

// 8. AUDIT LOGS (Append-only audit trail)
export const audit_logs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actor_user_id: uuid("actor_user_id"),
    action: text("action").notNull(),
    entity_type: text("entity_type").notNull(),
    entity_id: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    request_id: text("request_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgCreatedIdx: index("audit_org_created_idx").on(
      table.organization_id,
      table.created_at
    ),
    orgEntityIdx: index("audit_org_entity_idx").on(
      table.organization_id,
      table.entity_type,
      table.entity_id
    ),
  })
);

// 9. API KEYS
export const api_keys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key_prefix: text("key_prefix").notNull(), // e.g. "pk_live_123456"
    key_hash: text("key_hash").notNull(), // SHA-256 of raw secret
    expires_at: timestamp("expires_at", { withTimezone: true }),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    created_by: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    prefixIdx: index("api_keys_prefix_idx").on(table.key_prefix),
    orgIdx: index("api_keys_org_idx").on(table.organization_id),
  })
);

// 10. WEBHOOK EVENTS / IDEMPOTENCY
export const webhook_events = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    idempotency_key: text("idempotency_key").notNull(),
    event_id: text("event_id"),
    signature_timestamp: bigint("signature_timestamp", { mode: "number" }).notNull(),
    payload_hash: text("payload_hash").notNull(),
    status: text("status", {
      enum: ["pending", "processed", "failed"],
    })
      .notNull()
      .default("pending"),
    response_code: integer("response_code"),
    error_code: text("error_code"),
    processed_at: timestamp("processed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdempotencyUniqueIdx: uniqueIndex("webhook_org_idempotency_idx").on(
      table.organization_id,
      table.idempotency_key
    ),
  })
);

// 11. AI USAGE
export const ai_usage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    user_id: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    operation: text("operation").notNull(),
    input_tokens: integer("input_tokens"),
    output_tokens: integer("output_tokens"),
    estimated_cost: numeric("estimated_cost", { precision: 10, scale: 6 }),
    request_id: text("request_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("ai_usage_org_idx").on(table.organization_id),
    orgCreatedIdx: index("ai_usage_org_created_idx").on(
      table.organization_id,
      table.created_at
    ),
  })
);

// 12. LEAD SOURCES
export const lead_sources = pgTable(
  "lead_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["website", "meta_ads", "google_ads", "landing_page", "manual", "api"],
    }).notNull(),
    external_identifier: text("external_identifier"),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgTypeIdx: index("lead_sources_org_type_idx").on(
      table.organization_id,
      table.type
    ),
  })
);

// 13. TASKS
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organization_id: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contact_id: uuid("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    deal_id: uuid("deal_id").references(() => deals.id, {
      onDelete: "cascade",
    }),
    assigned_to_id: uuid("assigned_to_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    due_date: timestamp("due_date", { withTimezone: true }),
    priority: text("priority", {
      enum: ["low", "medium", "high"],
    })
      .notNull()
      .default("medium"),
    status: text("status", {
      enum: ["pending", "in_progress", "completed", "cancelled"],
    })
      .notNull()
      .default("pending"),
    created_by: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    orgAssignedIdx: index("tasks_org_assigned_idx").on(
      table.organization_id,
      table.assigned_to_id
    ),
    orgStatusIdx: index("tasks_org_status_idx").on(
      table.organization_id,
      table.status
    ),
  })
);
