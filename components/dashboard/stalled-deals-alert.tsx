import React from "react";
import Link from "next/link";
import { AlertTriangle, Clock, ArrowRight, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { DashboardMetrics } from "@/services/analytics";

interface StalledDealsAlertProps {
  stalledDeals: DashboardMetrics["stalledDeals"];
}

export function StalledDealsAlert({ stalledDeals }: StalledDealsAlertProps) {
  if (stalledDeals.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                No Stalled Deals Detected
              </p>
              <p className="text-[11px] text-muted-foreground">
                All open pipeline opportunities have registered activity within the last 14 days.
              </p>
            </div>
          </div>
          <Badge variant="success" className="text-[10px]">
            Healthy Pipeline
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-sm font-semibold text-amber-950 dark:text-amber-200">
            Pipeline Health Alert: {stalledDeals.length} Stalled {stalledDeals.length === 1 ? "Deal" : "Deals"}
          </CardTitle>
        </div>
        <Badge variant="warning" className="text-[10px]">
          &gt; 14 Days Inactive
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        <p className="text-xs text-muted-foreground mb-3">
          These open deals have had no customer outreach or activity for over two weeks. Recommended actions generated based on stage history:
        </p>

        <div className="space-y-2">
          {stalledDeals.slice(0, 3).map((deal) => (
            <div
              key={deal.dealId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md border border-amber-500/20 bg-background/80 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">
                    {deal.title}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatCurrency(deal.value, deal.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span>Stage: {deal.stageName}</span>
                  <span>•</span>
                  <span>Owner: {deal.ownerName}</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Stalled {deal.daysStalled} days
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground italic hidden md:inline">
                  &quot;{deal.recommendedAction}&quot;
                </span>
                <Link
                  href="/deals"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  View Deal <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
