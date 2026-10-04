import React from "react";
import { getAuthContext } from "@/lib/auth";
import { getDealsGroupedByStage } from "@/services/deals";
import { getContacts } from "@/services/contacts";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { KanbanColumnData } from "@/components/kanban/kanban-column";
import type { KanbanDeal } from "@/components/kanban/deal-card";

export const dynamic = "force-dynamic";

export default async function DealsPipelinePage() {
  const context = await getAuthContext();
  const { columns } = await getDealsGroupedByStage(context);
  const { data: contactsList } = await getContacts(context, { limit: 100 });

  // Map service response to the Kanban component's typed interface.
  // The service returns a superset of fields; we explicitly pick only what the component needs.
  const kanbanColumns: KanbanColumnData[] = columns.map((col) => ({
    stage: {
      id: col.stage.id,
      name: col.stage.name,
      key: col.stage.key,
      is_won: col.stage.is_won,
      is_lost: col.stage.is_lost,
    },
    deals: col.deals.map((deal): KanbanDeal => ({
      id: deal.id,
      title: deal.title,
      value: deal.value,
      currency: deal.currency,
      expected_close_date: deal.expected_close_date,
      pipeline_stage_id: deal.pipeline_stage_id,
      updated_at: deal.updated_at,
      contact: deal.contact
        ? {
            id: deal.contact.id,
            name: deal.contact.name,
            company_name: deal.contact.company_name,
            lead_score: deal.contact.lead_score,
          }
        : null,
      assigned_to: deal.assigned_to
        ? {
            id: deal.assigned_to.id,
            full_name: deal.assigned_to.full_name,
            avatar_url: deal.assigned_to.avatar_url,
          }
        : null,
    })),
    dealCount: col.dealCount,
    totalValue: col.totalValue,
  }));

  const simplifiedContacts = contactsList.map((c) => ({
    id: c.id,
    name: c.name,
    company_name: c.company_name,
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Deals Pipeline
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Interactive Kanban board with drag-and-drop, optimistic updates, and concurrency conflict protection
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard
          initialColumns={kanbanColumns}
          contacts={simplifiedContacts}
        />
      </div>
    </div>
  );
}
