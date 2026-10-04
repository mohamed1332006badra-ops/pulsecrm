import React from "react";
import { Phone, Users, FileText, Mail, ArrowRightLeft, Sparkles, Plus, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata?: any;
  created_at: Date | string;
  user?: {
    id: string;
    full_name: string;
  } | null;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onAddActivity?: () => void;
}

export function ActivityTimeline({
  activities,
  onAddActivity,
}: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case "meeting":
        return <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
      case "email":
        return <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case "stage_change":
        return <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      case "ai_analysis":
        return <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity Timeline ({activities.length})
        </CardTitle>
        {onAddActivity && (
          <button
            onClick={onAddActivity}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Log Activity
          </button>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No activity history recorded for this contact yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {activities.map((act) => (
              <div key={act.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[27px] top-0.5 h-6 w-6 rounded-full bg-card border flex items-center justify-center shadow-xs">
                  {getActivityIcon(act.type)}
                </div>

                <div className="rounded-md border p-3 bg-card/60 hover:bg-card transition-colors shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      {act.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatRelativeTime(act.created_at)}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                      {act.description}
                    </p>
                  )}

                  {act.user && (
                    <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>Logged by</span>
                      <span className="font-medium text-foreground">
                        {act.user.full_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
