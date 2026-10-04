import React from "react";
import { Building, Mail, Phone, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface ContactHeaderProps {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company_name: string | null;
    status: string;
    lead_score: number;
    source: string | null;
    created_at: Date | string;
    assigned_to?: {
      id: string;
      full_name: string;
      email: string;
    } | null;
  };
}

export function ContactHeader({ contact }: ContactHeaderProps) {
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
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Contact Identity */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/contacts"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Contacts
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {contact.name}
            </h1>
            <Badge
              variant={statusBadgeVariant(contact.status)}
              className="text-xs capitalize"
            >
              {contact.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
            {contact.company_name && (
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{contact.company_name}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1.5 font-mono">
                <Phone className="h-3.5 w-3.5" />
                <span>{contact.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-mono">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {formatDate(contact.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Lead Score & Assigned Rep */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
          <div className="text-center">
            <div
              className={`h-12 w-12 rounded-full mx-auto flex items-center justify-center font-mono font-bold text-sm border-2 ${
                contact.lead_score >= 80
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                  : contact.lead_score >= 50
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {contact.lead_score}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1 uppercase font-semibold">
              Lead Score
            </span>
          </div>

          <div className="border-l pl-4 text-left">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
              Assigned Representative
            </span>
            <p className="text-xs font-semibold text-foreground mt-0.5">
              {contact.assigned_to?.full_name || "Unassigned"}
            </p>
            {contact.source && (
              <span className="text-[11px] text-muted-foreground">
                Source: {contact.source}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
