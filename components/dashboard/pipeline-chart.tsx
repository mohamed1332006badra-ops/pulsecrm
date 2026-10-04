import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DashboardMetrics } from "@/services/analytics";

interface PipelineChartProps {
  stages: DashboardMetrics["dealsByStage"];
  totalPipelineValue: number;
}

export function PipelineChart({
  stages,
  totalPipelineValue,
}: PipelineChartProps) {
  const maxStageValue = Math.max(...stages.map((s) => s.totalValue), 1);

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Pipeline Stages Distribution
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active volume and capital allocated across sales cycles
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-foreground">
            {formatCurrency(totalPipelineValue)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        {stages.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No pipeline stages configured for this workspace.
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage) => {
              const percentage = Math.round(
                (stage.totalValue / maxStageValue) * 100
              );

              return (
                <div key={stage.stageId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {stage.stageName}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        ({stage.count} {stage.count === 1 ? "deal" : "deals"})
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrency(stage.totalValue)}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
