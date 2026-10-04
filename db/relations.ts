import { relations } from "drizzle-orm";
import {
  organizations,
  profiles,
  organization_members,
  pipeline_stages,
  contacts,
  deals,
  activities,
  audit_logs,
  api_keys,
  webhook_events,
  ai_usage,
  lead_sources,
  tasks,
} from "./schema";

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organization_members),
  profiles: many(profiles),
  pipelineStages: many(pipeline_stages),
  contacts: many(contacts),
  deals: many(deals),
  activities: many(activities),
  auditLogs: many(audit_logs),
  apiKeys: many(api_keys),
  webhookEvents: many(webhook_events),
  aiUsages: many(ai_usage),
  leadSources: many(lead_sources),
  tasks: many(tasks),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [profiles.organization_id],
    references: [organizations.id],
  }),
  assignedContacts: many(contacts),
  assignedDeals: many(deals),
  assignedTasks: many(tasks),
  createdActivities: many(activities),
}));

export const organizationMembersRelations = relations(
  organization_members,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organization_members.organization_id],
      references: [organizations.id],
    }),
    profile: one(profiles, {
      fields: [organization_members.user_id],
      references: [profiles.id],
    }),
  })
);

export const pipelineStagesRelations = relations(
  pipeline_stages,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [pipeline_stages.organization_id],
      references: [organizations.id],
    }),
    deals: many(deals),
  })
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organization_id],
    references: [organizations.id],
  }),
  assignedTo: one(profiles, {
    fields: [contacts.assigned_to_id],
    references: [profiles.id],
  }),
  deals: many(deals),
  activities: many(activities),
  tasks: many(tasks),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organization_id],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [deals.contact_id],
    references: [contacts.id],
  }),
  assignedTo: one(profiles, {
    fields: [deals.assigned_to_id],
    references: [profiles.id],
  }),
  stage: one(pipeline_stages, {
    fields: [deals.pipeline_stage_id],
    references: [pipeline_stages.id],
  }),
  activities: many(activities),
  tasks: many(tasks),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  organization: one(organizations, {
    fields: [activities.organization_id],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [activities.contact_id],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [activities.deal_id],
    references: [deals.id],
  }),
  user: one(profiles, {
    fields: [activities.user_id],
    references: [profiles.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.organization_id],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [tasks.contact_id],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [tasks.deal_id],
    references: [deals.id],
  }),
  assignedTo: one(profiles, {
    fields: [tasks.assigned_to_id],
    references: [profiles.id],
  }),
  creator: one(profiles, {
    fields: [tasks.created_by],
    references: [profiles.id],
  }),
}));
