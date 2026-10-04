"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Calendar, Building, Sparkles } from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface KanbanDeal {
  id: string;
  title: string;
  value: string | number;
  currency: string;
  expected_close_date: Date | string | null;
  pipeline_stage_id: string;
  updated_at: Date | string;
  contact?: {
    id: string;
    name: string;
    company_name?: string | null;
    lead_score?: number;
  } | null;
  assigned_to?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

interface DealCardProps {
  deal: KanbanDeal;
  isOverlay?: boolean;
}

export function DealCard({ deal, isOverlay }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: "Deal",
      deal,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isHighValue = parseFloat(String(deal.value)) >= 50000;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md select-none ${
        isDragging ? "opacity-30 ring-2 ring-primary ring-offset-2" : ""
      } ${isOverlay ? "rotate-2 shadow-xl ring-2 ring-primary cursor-grabbing" : "cursor-grab"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {deal.title}
            </h4>
            {isHighValue && (
              <Badge variant="warning" className="text-[9px] px-1 py-0 h-3.5 uppercase shrink-0">
                High Value
              </Badge>
            )}
          </div>

          {deal.contact?.company_name && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 truncate">
              <Building className="h-3 w-3 shrink-0" />
              <span className="truncate">{deal.contact.company_name}</span>
            </div>
          )}
        </div>

        <div
          {...listeners}
          className="text-muted-foreground/40 group-hover:text-muted-foreground p-0.5 rounded cursor-grab active:cursor-grabbing hover:bg-muted"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-foreground">
          {formatCurrency(deal.value, deal.currency)}
        </span>

        <div className="flex items-center gap-2">
          {deal.expected_close_date && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(deal.expected_close_date)}</span>
            </div>
          )}

          {deal.assigned_to && (
            <div
              title={`Assigned to ${deal.assigned_to.full_name}`}
              className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-mono flex items-center justify-center font-medium border border-primary/20 shrink-0"
            >
              {getInitials(deal.assigned_to.full_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
