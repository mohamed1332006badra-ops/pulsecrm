"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Building, Kanban, CheckSquare, ArrowRight, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

interface SearchResultItem {
  id: string;
  type: "contact" | "deal" | "task";
  title: string;
  subtitle?: string;
  href: string;
}

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Handle client-side search across quick actions and mock lookup
  useEffect(() => {
    if (!query.trim()) {
      setResults([
        {
          id: "nav-deals",
          type: "deal",
          title: "Go to Deals Pipeline",
          subtitle: "View active sales stages & Kanban",
          href: "/deals",
        },
        {
          id: "nav-contacts",
          type: "contact",
          title: "Go to Contacts Directory",
          subtitle: "View customer 360 & lead records",
          href: "/contacts",
        },
        {
          id: "nav-audit",
          type: "task",
          title: "Inspect Security Audit Logs",
          subtitle: "Administrative audit trail",
          href: "/audit",
        },
      ]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      // In production, this queries `/api/v1/search?q=...`
      const term = query.toLowerCase();
      const hits: SearchResultItem[] = [];

      if ("cairo heavy equipment".includes(term) || "ahmed soliman".includes(term)) {
        hits.push({
          id: "c-1",
          type: "contact",
          title: "Ahmed Soliman (Cairo Heavy Equipment)",
          subtitle: "Lead Score: 95 • Customer",
          href: "/contacts/55555555-5555-5555-5555-000000000001",
        });
      }

      if ("nile valves".includes(term) || "mona".includes(term)) {
        hits.push({
          id: "c-2",
          type: "contact",
          title: "Mona El-Gammal (Nile Industrial Valves)",
          subtitle: "Lead Score: 85 • Qualified",
          href: "/contacts/55555555-5555-5555-5555-000000000002",
        });
      }

      if ("gulf petrochemical".includes(term) || "hassan".includes(term)) {
        hits.push({
          id: "c-3",
          type: "contact",
          title: "Hassan Al-Hajri (Gulf Petrochemical Corp)",
          subtitle: "Lead Score: 90 • Qualified",
          href: "/contacts/55555555-5555-5555-5555-000000000003",
        });
      }

      if ("supply agreement".includes(term) || "machinery".includes(term) || "deal".includes(term)) {
        hits.push({
          id: "d-1",
          type: "deal",
          title: "Cairo Heavy Equipment - Supply Agreement",
          subtitle: "$125,000 • Proposal Sent Stage",
          href: "/deals",
        });
      }

      setResults(hits);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-3">
        {/* Search Input Box */}
        <div className="flex items-center gap-2 border-b pb-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type to search contacts, deals, or commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Searching authorized workspace data...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No results found in your authorized organization for &quot;{query}&quot;.
            </div>
          )}

          {!loading &&
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.href)}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-accent text-left transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                    {item.type === "contact" && (
                      <User className="h-3.5 w-3.5 text-primary" />
                    )}
                    {item.type === "deal" && (
                      <Kanban className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {item.type === "task" && (
                      <CheckSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t pt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with arrows • Enter to open</span>
          <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">
            ESC
          </kbd>
        </div>
      </div>
    </Dialog>
  );
}
