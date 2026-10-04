"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DealCard, KanbanDeal } from "./deal-card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface KanbanColumnData {
  stage: {
    id: string;
    name: string;
    key: string;
    is_won: boolean;
    is_lost: boolean;
  };
  deals: KanbanDeal[];
  dealCount: number;
  totalValue: number;
}

interface KanbanColumnProps {
  column: KanbanColumnData;
}

export function KanbanColumn({ column }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.stage.id,
    data: {
      type: "Column",
      stageId: column.stage.id,
    },
  });

  const dealIds = column.deals.map((d) => d.id);

  // Column header status color
  const getHeaderBadge = () => {
    if (column.stage.is_won) return "success";
    if (column.stage.is_lost) return "destructive";
    return "secondary";
  };

  return (
    <div className="flex flex-col w-80 shrink-0 rounded-lg border bg-muted/30 max-h-[calc(100vh-12rem)] flex-1 min-w-[280px]">
      {/* Column Header */}
      <div className="p-3 border-b bg-card rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs tracking-tight text-foreground truncate">
            {column.stage.name}
          </span>
          <Badge
            variant={getHeaderBadge()}
            className="text-[10px] font-mono px-1.5 py-0 h-4"
          >
            {column.dealCount}
          </Badge>
        </div>

        <span className="font-mono text-xs font-bold text-muted-foreground shrink-0">
          {formatCurrency(column.totalValue)}
        </span>
      </div>

      {/* Droppable Deals Area */}
      <div
        ref={setNodeRef}
        className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 transition-colors min-h-[150px] ${
          isOver ? "bg-primary/5 ring-1 ring-primary/30 rounded-b-lg" : ""
        }`}
      >
        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
          {column.deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>

        {column.deals.length === 0 && (
          <div className="h-24 rounded-md border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
            Drop deal here
          </div>
        )}
      </div>
    </div>
  );
}
