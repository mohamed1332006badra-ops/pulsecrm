import React from "react";
import { getAuthContext } from "@/lib/auth";
import { getContactById } from "@/services/contacts";
import { ContactHeader } from "@/components/customer-360/contact-header";
import { ActivityTimeline } from "@/components/customer-360/activity-timeline";
import { LeadScoreBreakdown } from "@/components/customer-360/lead-score-breakdown";
import { AiCopilotWidget } from "@/components/customer-360/ai-copilot-widget";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Kanban, CheckSquare } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ContactDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function ContactDetailsPage({
  params,
}: ContactDetailsPageProps) {
  const context = await getAuthContext();
  const contactData = await getContactById(context, params.id);

  const { contact, deals, activities, tasks, scoringBreakdown } = contactData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Customer 360 Header */}
      <ContactHeader contact={contact as any} />

      {/* Main Grid: Left (AI Copilot & Timeline) | Right (Deals, Tasks, Scoring Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): AI Copilot & Chronological Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Sales Copilot Widget */}
          <AiCopilotWidget contactId={contact.id} />

          {/* Activity Timeline */}
          <ActivityTimeline activities={activities as any} />
        </div>

        {/* Right Column (1 Col): Deals, Tasks, Lead Score Explainer */}
        <div className="space-y-6">
          {/* Explainable Lead Score Factor Breakdown */}
          <LeadScoreBreakdown scoreData={scoringBreakdown} />

          {/* Associated Deals */}
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Kanban className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Associated Deals ({deals.length})
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              {deals.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No deals linked to this contact.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href="/deals"
                          className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {deal.title}
                        </Link>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {deal.stage?.name}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px]">
                        <span className="font-mono font-bold text-foreground">
                          {formatCurrency(deal.value, deal.currency)}
                        </span>
                        {deal.expected_close_date && (
                          <span className="text-muted-foreground font-mono">
                            Closes {formatDate(deal.expected_close_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Follow-up Tasks ({tasks.length})
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No active tasks scheduled for this contact.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-md border bg-card text-xs flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={task.priority === "high" ? "destructive" : "secondary"}
                            className="text-[9px] px-1 py-0 uppercase"
                          >
                            {task.priority}
                          </Badge>
                          <span className="font-medium text-foreground truncate">
                            {task.title}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
