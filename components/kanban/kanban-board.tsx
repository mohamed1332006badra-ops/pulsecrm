"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn, KanbanColumnData } from "./kanban-column";
import { DealCard, KanbanDeal } from "./deal-card";
import { CreateDealDialog } from "./create-deal-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { moveDealStageAction } from "@/app/actions/deals";
import { Plus, Search, Filter } from "lucide-react";

interface KanbanBoardProps {
  initialColumns: KanbanColumnData[];
  contacts: Array<{ id: string; name: string; company_name?: string | null }>;
}

export function KanbanBoard({ initialColumns, contacts }: KanbanBoardProps) {
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumnData[]>(initialColumns);
  const [activeDeal, setActiveDeal] = useState<KanbanDeal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Configure sensors for responsive touch and drag handling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required to distinguish click from drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dealId = String(active.id);

    // Find active deal across columns
    for (const col of columns) {
      const found = col.deals.find((d) => d.id === dealId);
      if (found) {
        setActiveDeal(found);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = String(active.id);
    const overId = String(over.id);

    // Locate source column
    let sourceColIndex = -1;
    let dealToMove: KanbanDeal | null = null;

    for (let i = 0; i < columns.length; i++) {
      const d = columns[i].deals.find((deal) => deal.id === dealId);
      if (d) {
        sourceColIndex = i;
        dealToMove = d;
        break;
      }
    }

    if (!dealToMove || sourceColIndex === -1) return;

    // Locate target column: over could be a column id or another deal card id
    let targetColIndex = columns.findIndex((c) => c.stage.id === overId);
    if (targetColIndex === -1) {
      // Look for the column containing the hovered deal card
      targetColIndex = columns.findIndex((c) =>
        c.deals.some((deal) => deal.id === overId)
      );
    }

    if (targetColIndex === -1 || targetColIndex === sourceColIndex) {
      return; // Dropped in the same column
    }

    const targetStage = columns[targetColIndex].stage;
    const sourceStage = columns[sourceColIndex].stage;

    // 1. Capture snapshot for optimistic rollback
    const previousSnapshot = [...columns.map((c) => ({ ...c, deals: [...c.deals] }))];

    // 2. Perform optimistic update immediately
    const nextColumns = columns.map((col, idx) => {
      if (idx === sourceColIndex) {
        const remaining = col.deals.filter((d) => d.id !== dealId);
        const total = remaining.reduce((sum, d) => sum + parseFloat(String(d.value)), 0);
        return {
          ...col,
          deals: remaining,
          dealCount: remaining.length,
          totalValue: total,
        };
      }
      if (idx === targetColIndex) {
        const updatedDeal: KanbanDeal = {
          ...dealToMove!,
          pipeline_stage_id: targetStage.id,
        };
        const updatedDeals = [updatedDeal, ...col.deals];
        const total = updatedDeals.reduce((sum, d) => sum + parseFloat(String(d.value)), 0);
        return {
          ...col,
          deals: updatedDeals,
          dealCount: updatedDeals.length,
          totalValue: total,
        };
      }
      return col;
    });

    setColumns(nextColumns);

    // 3. Dispatch Server Action with optimistic concurrency check
    const result = await moveDealStageAction({
      deal_id: dealId,
      pipeline_stage_id: targetStage.id,
      expected_version: String(dealToMove.updated_at),
    });

    if (result.success) {
      toast({
        title: "Stage Updated",
        description: `Moved "${dealToMove.title}" to ${targetStage.name}.`,
        type: "success",
      });
    } else {
      // 4. Rollback on failure or conflict
      setColumns(previousSnapshot);

      if (result.code === "CONFLICT") {
        toast({
          title: "Concurrent Edit Detected",
          description: "Another user modified this deal concurrently. Pipeline state was refreshed.",
          type: "warning",
        });
      } else {
        toast({
          title: "Move Failed",
          description: result.error || "Could not move deal. Rolled back.",
          type: "error",
        });
      }
    }
  };

  // Filter deals based on search term
  const filteredColumns = columns.map((col) => {
    if (!searchQuery.trim()) return col;
    const term = searchQuery.toLowerCase();
    const matching = col.deals.filter(
      (d) =>
        d.title.toLowerCase().includes(term) ||
        d.contact?.company_name?.toLowerCase().includes(term) ||
        d.contact?.name.toLowerCase().includes(term)
    );
    const total = matching.reduce((sum, d) => sum + parseFloat(String(d.value)), 0);
    return {
      ...col,
      deals: matching,
      dealCount: matching.length,
      totalValue: total,
    };
  });

  const stagesList = columns.map((c) => ({
    id: c.stage.id,
    name: c.stage.name,
  }));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Kanban Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              placeholder="Filter deals by title, contact, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="text-xs h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Deal</span>
          </Button>
        </div>
      </div>

      {/* Dnd-kit Drag and Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start gap-4 overflow-x-auto pb-4 flex-1">
          {filteredColumns.map((col) => (
            <KanbanColumn key={col.stage.id} column={col} />
          ))}
        </div>

        {/* Drag Overlay for smooth visual card following */}
        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Create Deal Modal */}
      <CreateDealDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        stages={stagesList}
        contacts={contacts}
      />
    </div>
  );
}
