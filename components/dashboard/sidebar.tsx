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
  X,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/app/actions/workspace";
import { UserSession } from "@/lib/auth/constants";

interface SidebarContentProps {
  session: UserSession;
  onNavigate?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  session,
  onNavigate,
  showCloseButton,
  onClose,
}: SidebarContentProps) {
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
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Workspace Brand Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              P
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-foreground truncate">
                  PulseCRM
                </span>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded border border-primary/20 shrink-0">
                  v3
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{session.organizationName}</span>
              </div>
            </div>
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors md:hidden shrink-0"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
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
                onClick={onNavigate}
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
      <div className="p-3 border-t bg-muted/30 shrink-0">
        {session.isDemoMode && (
          <div className="mb-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Interactive Demo Session</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-accent transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-medium text-xs font-mono border shrink-0">
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
            onClick={() => {
              onNavigate?.();
              logoutAction();
            }}
            title="Switch Session"
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

interface SidebarProps {
  session: UserSession;
  className?: string;
}

export function Sidebar({ session, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden md:flex w-64 border-r bg-card flex-col justify-between shrink-0 select-none h-screen sticky top-0",
        className
      )}
    >
      <SidebarContent session={session} />
    </aside>
  );
}

interface MobileSidebarProps {
  session: UserSession;
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ session, open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  // Close automatically whenever pathname changes
  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll and close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Sheet */}
      <div className="relative z-50 w-72 max-w-[85vw] bg-card border-r shadow-2xl flex flex-col justify-between h-full select-none animate-slide-in-left">
        <SidebarContent
          session={session}
          onNavigate={onClose}
          showCloseButton
          onClose={onClose}
        />
      </div>
    </div>
  );
}
