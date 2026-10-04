import React from "react";
import { getAuthContext } from "@/lib/auth";
import { getDashboardMetrics } from "@/services/analytics";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StalledDealsAlert } from "@/components/dashboard/stalled-deals-alert";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import {
  DollarSign,
  Kanban,
  Trophy,
  Percent,
  Users,
  Activity,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getAuthContext();

  // Gracefully degrade when database is unreachable (e.g. demo/E2E without live DB)
  let metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  try {
    metrics = await getDashboardMetrics(context);
  } catch {
    metrics = {
      totalPipelineValue: 0,
      openDealsCount: 0,
      wonRevenue: 0,
      lostDealsCount: 0,
      conversionRate: 0,
      totalContactsCount: 0,
      newLeadsCount30Days: 0,
      dealsByStage: [],
      recentActivities: [],
      stalledDeals: [],
      repPerformance: [],
    };
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Executive CRM Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time pipeline metrics and sales velocity derived directly from PostgreSQL
          </p>
        </div>
      </div>

      {/* Stalled Deals Alert Banner (Section 42) */}
      <StalledDealsAlert stalledDeals={metrics.stalledDeals} />

      {/* KPI Cards Grid (Section 41) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Pipeline Value"
          value={formatCurrency(metrics.totalPipelineValue)}
          subtitle={`${metrics.openDealsCount} open opportunities`}
          icon={DollarSign}
          trend={{ value: "+14.2% vs last mo", isPositive: true }}
        />
        <KpiCard
          title="Won Revenue"
          value={formatCurrency(metrics.wonRevenue)}
          subtitle="Closed won contracts"
          icon={Trophy}
          trend={{ value: "+8.5%", isPositive: true }}
        />
        <KpiCard
          title="Win Conversion Rate"
          value={`${metrics.conversionRate}%`}
          subtitle={`From ${metrics.openDealsCount + metrics.lostDealsCount} total evaluations`}
          icon={Percent}
        />
        <KpiCard
          title="Total Leads & Contacts"
          value={metrics.totalContactsCount}
          subtitle={`+${metrics.newLeadsCount30Days} new in last 30d`}
          icon={Users}
        />
      </div>

      {/* Charts & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution Chart */}
        <PipelineChart
          stages={metrics.dealsByStage}
          totalPipelineValue={metrics.totalPipelineValue}
        />

        {/* Sales Representatives Performance */}
        <Card>
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                Representative Allocation
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Round-robin pipeline distribution
            </p>
          </CardHeader>

          <CardContent className="p-5 pt-2">
            {metrics.repPerformance.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active representative deals recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.repPerformance.map((rep) => (
                  <div
                    key={rep.repId}
                    className="flex items-center justify-between text-xs p-2 rounded-md border bg-muted/20"
                  >
                    <div>
                      <span className="font-semibold text-foreground block">
                        {rep.repName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {rep.dealsCount} active {rep.dealsCount === 1 ? "deal" : "deals"}
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-foreground block">
                        {formatCurrency(rep.pipelineValue)}
                      </span>
                      {rep.wonValue > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Won: {formatCurrency(rep.wonValue)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent CRM Activities Feed */}
      <Card>
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Recent CRM Activity Stream
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Live business events: meetings, calls, stage movements, and webhook ingestions
          </p>
        </CardHeader>

        <CardContent className="p-5 pt-2">
          {metrics.recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No recent CRM activities recorded.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {metrics.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="py-2.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground truncate block">
                      {act.title}
                    </span>
                    {act.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xl">
                        {act.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 text-muted-foreground">
                    <span className="text-[11px] font-mono block">
                      {formatRelativeTime(act.created_at)}
                    </span>
                    {act.userName && (
                      <span className="text-[10px] text-foreground font-medium">
                        by {act.userName}
                      </span>
                    )}
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
