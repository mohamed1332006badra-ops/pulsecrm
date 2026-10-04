import React from "react";
import { getAuthContext } from "@/lib/auth";
import { getAuditLogs } from "@/services/audit";
import { canViewAuditLogs } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { ShieldAlert, User, Clock, Terminal } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const context = await getAuthContext();

  if (!canViewAuditLogs(context)) {
    redirect("/");
  }

  const { data: logs, page, limit } = await getAuditLogs(context, { limit: 50 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Security Audit Trail
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Immutable, append-only security logs recording authentication, data exports, webhook ingestions, and mutations
        </p>
      </div>

      <Card>
        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recorded Events ({logs.length})
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Append-Only (RLS Protected)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No audit records currently found for this organization.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-muted/20 transition-colors text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                        {log.action}
                      </Badge>
                      <span className="font-semibold text-foreground">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ""}
                      </span>
                    </div>

                    {log.metadata && (
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground bg-muted/40 p-1.5 rounded max-w-xl truncate">
                        <Terminal className="h-3 w-3 shrink-0" />
                        <span className="truncate">{JSON.stringify(log.metadata)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-muted-foreground shrink-0 text-right">
                    <div>
                      {log.ip_address && (
                        <span className="text-[10px] font-mono block">
                          IP: {log.ip_address}
                        </span>
                      )}
                      {log.request_id && (
                        <span className="text-[10px] font-mono block">
                          Req: {log.request_id}
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-[11px] text-foreground">
                      <span className="block font-medium">
                        {formatRelativeTime(log.created_at)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
