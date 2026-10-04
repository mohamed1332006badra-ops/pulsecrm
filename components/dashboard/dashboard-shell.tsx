"use client";

import React, { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { CommandMenu } from "@/components/dashboard/command-menu";
import { UserSession } from "@/lib/auth/constants";

interface DashboardShellProps {
  session: UserSession;
  children: React.ReactNode;
}

export function DashboardShell({ session, children }: DashboardShellProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        session={session}
        onOpenCommandMenu={() => setCommandMenuOpen(true)}
      />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
      <CommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
      />
    </div>
  );
}
