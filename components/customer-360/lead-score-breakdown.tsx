import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { LeadScoreResult } from "@/services/lead-scoring";

interface LeadScoreBreakdownProps {
  scoreData: LeadScoreResult;
}

export function LeadScoreBreakdown({ scoreData }: LeadScoreBreakdownProps) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explainable Lead Scoring Model
          </CardTitle>
        </div>
        <span className="font-mono font-bold text-xs text-foreground">
          Score: {scoreData.score}/100
        </span>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        <p className="text-[11px] text-muted-foreground mb-3">
          Transparent algorithmic attribution based on verifiable customer data:
        </p>

        <div className="space-y-2">
          {scoreData.reasons.map((r, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/40 text-xs border border-border/50"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-foreground leading-tight">
                  {r.description}
                </span>
              </div>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                +{r.points}
              </span>
            </div>
          ))}

          {scoreData.reasons.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No scoring factors recorded yet. Complete contact profile to increase lead score.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
