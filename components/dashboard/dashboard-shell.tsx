"use client";

import React, { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { CommandMenu } from "@/components/dashboard/command-menu";
import { MobileSidebar } from "@/components/dashboard/sidebar";
import { UserSession } from "@/lib/auth/constants";

interface DashboardShellProps {
  session: UserSession;
  children: React.ReactNode;
}

export function DashboardShell({ session, children }: DashboardShellProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 w-full">
      <Header
        session={session}
        onOpenCommandMenu={() => setCommandMenuOpen(true)}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      />
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto w-full">
        {children}
      </main>
      <CommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
      />
      <MobileSidebar
        session={session}
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
    </div>
  );
}
