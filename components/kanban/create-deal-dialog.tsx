"use client";

import React, { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createDealAction } from "@/app/actions/deals";

interface StageOption {
  id: string;
  name: string;
}

interface ContactOption {
  id: string;
  name: string;
  company_name?: string | null;
}

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: StageOption[];
  contacts: ContactOption[];
  defaultStageId?: string;
}

export function CreateDealDialog({
  open,
  onOpenChange,
  stages,
  contacts,
  defaultStageId,
}: CreateDealDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState(contacts[0]?.id || "");
  const [stageId, setStageId] = useState(defaultStageId || stages[0]?.id || "");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [closeDate, setCloseDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !contactId || !stageId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required deal fields.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    const result = await createDealAction({
      title: title.trim(),
      contact_id: contactId,
      pipeline_stage_id: stageId,
      value: parseFloat(value) || 0,
      currency,
      expected_close_date: closeDate ? new Date(closeDate).toISOString() : null,
    });
    setLoading(false);

    if (result.success) {
      toast({
        title: "Deal Created",
        description: `Successfully added "${title}" to pipeline.`,
        type: "success",
      });
      onOpenChange(false);
      setTitle("");
      setValue("");
      setCloseDate("");
    } else {
      toast({
        title: "Deal Creation Failed",
        description: result.error,
        type: "error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Create New Deal</DialogTitle>
        <DialogDescription>
          Add an enterprise opportunity to the authorized workspace pipeline.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div>
          <label className="font-medium text-foreground block mb-1">
            Deal Title *
          </label>
          <Input
            placeholder="e.g. Cairo Heavy Equipment - Master Agreement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-foreground block mb-1">
              Associated Contact *
            </label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company_name ? `(${c.company_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">
              Initial Stage *
            </label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              required
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="font-medium text-foreground block mb-1">
              Estimated Value
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="USD">USD ($)</option>
              <option value="EGP">EGP (E£)</option>
              <option value="AED">AED (د.إ)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-medium text-foreground block mb-1">
            Expected Close Date
          </label>
          <Input
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating Deal..." : "Create Deal"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
