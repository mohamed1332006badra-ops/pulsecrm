"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  ShieldAlert,
  Settings,
  Key,
  LogOut,
  Building2,
  Sparkles,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/app/actions/workspace";
import { UserSession } from "@/lib/auth/constants";

interface SidebarProps {
  session: UserSession;
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      label: "Deals Pipeline",
      href: "/deals",
      icon: Kanban,
      active: pathname === "/deals",
    },
    {
      label: "Contacts & 360",
      href: "/contacts",
      icon: Users,
      active: pathname.startsWith("/contacts"),
    },
    {
      label: "Audit Trail",
      href: "/audit",
      icon: ShieldAlert,
      active: pathname === "/audit",
      restricted: session.role === "sales_rep" || session.role === "viewer",
    },
    {
      label: "Team & Roles",
      href: "/settings/team",
      icon: Users,
      active: pathname === "/settings/team",
      restricted: session.role === "sales_rep" || session.role === "viewer",
    },
    {
      label: "API Keys & Webhooks",
      href: "/settings/security",
      icon: Key,
      active: pathname === "/settings/security",
      restricted: session.role === "sales_rep" || session.role === "viewer",
    },
    {
      label: "Workspace Settings",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
      restricted: session.role === "sales_rep" || session.role === "viewer",
    },
  ];

  const roleColors: Record<string, "default" | "secondary" | "success" | "warning"> = {
    owner: "default",
    admin: "warning",
    sales_rep: "success",
    viewer: "secondary",
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col justify-between shrink-0 select-none h-screen sticky top-0">
      <div>
        {/* Workspace Brand Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm">
              P
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-foreground truncate">
                  PulseCRM
                </span>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded border border-primary/20">
                  v3
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{session.organizationName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Workspace
          </div>

          {navItems.map((item) => {
            if (item.restricted) return null;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  item.active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer User Profile & Demo Mode Tag */}
      <div className="p-3 border-t bg-muted/30">
        {session.isDemoMode && (
          <div className="mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Interactive Demo Session</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-accent transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-medium text-xs font-mono border">
              {getInitials(session.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate leading-tight text-foreground">
                {session.fullName}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge
                  variant={roleColors[session.role] || "secondary"}
                  className="text-[10px] px-1.5 py-0 uppercase h-4"
                >
                  {session.role.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={() => logoutAction()}
            title="Switch Session"
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
