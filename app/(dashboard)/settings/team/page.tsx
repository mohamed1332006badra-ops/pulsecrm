import React from "react";
import { getAuthContext } from "@/lib/auth";
import { canManageMembers } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Clock } from "lucide-react";
import { getInitials, formatDate, formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const context = await getAuthContext();

  if (!canManageMembers(context)) {
    redirect("/");
  }

  // Fetch all members in this organization (with demo fallback if DB is offline)
  let members: any[] = [];
  try {
    members = await db
      .select({
        id: schema.organization_members.id,
        role: schema.organization_members.role,
        status: schema.organization_members.status,
        created_at: schema.organization_members.created_at,
        profile: {
          id: schema.profiles.id,
          full_name: schema.profiles.full_name,
          email: schema.profiles.email,
          last_lead_assigned_at: schema.profiles.last_lead_assigned_at,
        },
      })
      .from(schema.organization_members)
      .innerJoin(
        schema.profiles,
        eq(schema.organization_members.user_id, schema.profiles.id)
      )
      .where(
        eq(schema.organization_members.organization_id, context.organizationId)
      );
  } catch {
    const { DEMO_USERS } = await import("@/lib/auth/constants");
    const tenantUsers = DEMO_USERS.filter((u) => u.orgId === context.organizationId);
    members = tenantUsers.map((u, i) => ({
      id: `mem-${i}`,
      role: u.role,
      status: "active",
      created_at: new Date(),
      profile: {
        id: u.id,
        full_name: u.fullName,
        email: u.email,
        last_lead_assigned_at: new Date(Date.now() - 3600000),
      },
    }));
  }

  const roleBadgeColor = (r: string) => {
    switch (r) {
      case "owner":
        return "default";
      case "admin":
        return "warning";
      case "sales_rep":
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Members & Role-Based Access
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage workspace members, role capabilities, and round-robin sales representative assignments
        </p>
      </div>

      <Card>
        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Members ({members.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold font-mono flex items-center justify-center border shrink-0">
                    {getInitials(m.profile.full_name)}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground text-sm block">
                      {m.profile.full_name}
                    </span>
                    <span className="text-muted-foreground">
                      {m.profile.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {m.profile.last_lead_assigned_at && (
                    <div
                      title="Last Round-Robin Lead Assignment"
                      className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground font-mono"
                    >
                      <Clock className="h-3 w-3" />
                      <span>Assigned {formatRelativeTime(m.profile.last_lead_assigned_at)}</span>
                    </div>
                  )}

                  <Badge variant={roleBadgeColor(m.role)} className="capitalize text-[10px]">
                    {m.role.replace("_", " ")}
                  </Badge>

                  <Badge variant="outline" className="text-[10px] capitalize">
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
