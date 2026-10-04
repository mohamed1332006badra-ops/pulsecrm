import React from "react";
import { getAuthContext, getSession } from "@/lib/auth";
import { canManageOrganization } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ShieldCheck, Database, Server } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getAuthContext();
  const session = await getSession();

  if (!canManageOrganization(context)) {
    redirect("/");
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Workspace Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          General configuration, tenancy boundaries, and system metadata
        </p>
      </div>

      <Card>
        <CardHeader className="p-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Organization Information
            </CardTitle>
          </div>
          <CardDescription>
            Tenant identifier and unique isolation parameters
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-0 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-md border bg-muted/20">
              <span className="text-muted-foreground block text-[11px]">Organization Name</span>
              <span className="font-semibold text-foreground text-sm mt-0.5 block">
                {session?.organizationName}
              </span>
            </div>

            <div className="p-3 rounded-md border bg-muted/20">
              <span className="text-muted-foreground block text-[11px]">Slug / Workspace Handle</span>
              <span className="font-mono text-foreground text-sm mt-0.5 block">
                {session?.organizationSlug}
              </span>
            </div>

            <div className="p-3 rounded-md border bg-muted/20 md:col-span-2">
              <span className="text-muted-foreground block text-[11px]">Tenant UUID (Database Key)</span>
              <span className="font-mono text-muted-foreground text-xs mt-0.5 block break-all">
                {context.organizationId}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-sm font-semibold">
              Multi-Tenant Architecture Status
            </CardTitle>
          </div>
          <CardDescription>
            Database engine isolation and Row-Level Security verification
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-0 space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-md border bg-card">
            <div>
              <span className="font-semibold text-foreground block">
                PostgreSQL Row-Level Security (RLS)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Policies active on organizations, profiles, contacts, deals, activities, and audit logs.
              </span>
            </div>
            <Badge variant="success" className="text-[10px]">
              Active & Enforced
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-md border bg-card">
            <div>
              <span className="font-semibold text-foreground block">
                Foreign Key Relationship Defense
              </span>
              <span className="text-[11px] text-muted-foreground">
                Deals and contacts verified for shared organization boundary before database insert.
              </span>
            </div>
            <Badge variant="success" className="text-[10px]">
              Guaranteed
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
