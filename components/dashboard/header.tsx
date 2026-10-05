"use client";

import React, { useState } from "react";
import { Search, Building2, UserCheck, ShieldCheck, Menu } from "lucide-react";
import { UserSession, DEMO_USERS } from "@/lib/auth/constants";
import { switchWorkspaceAction, switchDemoUserAction } from "@/app/actions/workspace";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  session: UserSession;
  onOpenCommandMenu?: () => void;
  onOpenMobileSidebar?: () => void;
}

export function Header({
  session,
  onOpenCommandMenu,
  onOpenMobileSidebar,
}: HeaderProps) {
  const [switching, setSwitching] = useState(false);

  // Group demo users by tenant
  const apexUsers = DEMO_USERS.filter((u) => u.orgSlug === "apex-industrial");
  const horizonUsers = DEMO_USERS.filter((u) => u.orgSlug === "horizon-logistics");

  const handleUserChange = async (userId: string) => {
    setSwitching(true);
    await switchDemoUserAction(userId);
    setSwitching(false);
  };

  return (
    <header className="h-14 border-b bg-card/60 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 w-full gap-2">
      {/* Global Search Bar & Mobile Menu Trigger */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-md min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors shrink-0"
          aria-label="Open navigation menu"
          title="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={onOpenCommandMenu}
          className="w-full flex items-center justify-between text-xs text-muted-foreground bg-muted/50 border border-input rounded-md px-3 py-1.5 hover:bg-muted transition-colors truncate"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Search contacts, deals, companies...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-sm shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right controls: Demo Switcher & Security Verification */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Prominent Demo Role Persona Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/60 border rounded-md px-2 py-1 max-w-[170px] sm:max-w-none">
          <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
            Persona:
          </span>
          <select
            disabled={switching}
            value={session.userId}
            onChange={(e) => handleUserChange(e.target.value)}
            className="text-xs bg-transparent border-0 font-medium focus:outline-none cursor-pointer text-foreground pr-1 truncate w-full"
          >
            <optgroup label="Apex Industrial Supplies">
              {apexUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role.replace("_", " ")})
                </option>
              ))}
            </optgroup>
            <optgroup label="Horizon Logistics (Tenant 2)">
              {horizonUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role.replace("_", " ")})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Multi-Tenant Security Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Tenant Isolated</span>
        </div>
      </div>
    </header>
  );
}
