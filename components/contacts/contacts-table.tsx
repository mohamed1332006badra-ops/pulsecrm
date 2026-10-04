"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Plus,
  ArrowUpDown,
  ExternalLink,
  Trash2,
  Building,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { CreateContactDialog } from "./create-contact-dialog";
import { deleteContactAction, exportContactsAction } from "@/app/actions/contacts";
import { formatDate } from "@/lib/utils";

export interface ContactListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  status: "new" | "contacted" | "qualified" | "customer" | "unqualified";
  lead_score: number;
  source: string | null;
  created_at: Date | string;
  assigned_to?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

interface ContactsTableProps {
  initialContacts: ContactListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  canExport?: boolean;
}

export function ContactsTable({
  initialContacts,
  totalCount,
  currentPage,
  totalPages,
  canExport = true,
}: ContactsTableProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactListItem[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter contacts locally for fast responsiveness
  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);

    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (contactId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete contact "${name}"?`)) {
      return;
    }

    const result = await deleteContactAction(contactId);
    if (result.success) {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      toast({
        title: "Contact Deleted",
        description: `Removed ${name} from database.`,
        type: "success",
      });
    } else {
      toast({
        title: "Delete Failed",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    const result = await exportContactsAction();
    setExporting(false);

    if (result.success && result.csvContent) {
      // Trigger browser download
      const blob = new Blob([result.csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pulsecrm_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Completed",
        description: "Contacts CSV file downloaded and activity recorded in audit trail.",
        type: "success",
      });
    } else {
      toast({
        title: "Export Failed",
        description: result.error || "Could not generate export.",
        type: "error",
      });
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "customer":
        return "success";
      case "qualified":
        return "info";
      case "contacted":
        return "warning";
      case "unqualified":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              placeholder="Search by name, company, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="customer">Customer</option>
            <option value="unqualified">Unqualified</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="text-xs h-8 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{exporting ? "Exporting..." : "Export CSV"}</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="text-xs h-8 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b bg-muted/40 uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Contact & Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Lead Score</th>
                <th className="px-4 py-3">Communication</th>
                <th className="px-4 py-3">Assigned Rep</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{contact.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      {contact.company_name ? (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <Building className="h-3 w-3" />
                          <span>{contact.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          No company specified
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Badge
                      variant={statusBadgeVariant(contact.status)}
                      className="text-[10px] capitalize"
                    >
                      {contact.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border ${
                          contact.lead_score >= 80
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : contact.lead_score >= 50
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {contact.lead_score}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {contact.lead_score >= 80 ? "High" : contact.lead_score >= 50 ? "Medium" : "Low"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-0.5 text-[11px]">
                      {contact.email && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground font-mono">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {contact.assigned_to ? (
                      <span className="text-foreground font-medium">
                        {contact.assigned_to.full_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground font-mono">
                    {formatDate(contact.created_at)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Customer 360 View"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        onClick={() => handleDelete(contact.id, contact.name)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No contacts found matching your current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Counts */}
        <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filtered.length} of {totalCount} contacts in authorized workspace
          </span>
          <span>Page {currentPage} of {Math.max(1, totalPages)}</span>
        </div>
      </div>

      <CreateContactDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
