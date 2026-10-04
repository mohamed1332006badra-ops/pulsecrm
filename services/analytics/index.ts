import { db, schema } from "@/lib/db";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { AuthContext } from "@/lib/authorization";

export interface DashboardMetrics {
  totalPipelineValue: number;
  openDealsCount: number;
  wonRevenue: number;
  lostDealsCount: number;
  conversionRate: number; // Percentage 0 - 100
  totalContactsCount: number;
  newLeadsCount30Days: number;
  dealsByStage: Array<{
    stageId: string;
    stageName: string;
    stageKey: string;
    count: number;
    totalValue: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    created_at: Date;
    userName: string | null;
  }>;
  stalledDeals: Array<{
    dealId: string;
    title: string;
    value: number;
    currency: string;
    stageName: string;
    ownerName: string;
    daysStalled: number;
    lastActivityDate: Date | null;
    recommendedAction: string;
  }>;
  repPerformance: Array<{
    repId: string;
    repName: string;
    dealsCount: number;
    pipelineValue: number;
    wonValue: number;
  }>;
}

export async function getDashboardMetrics(
  context: AuthContext,
  stalledDaysThreshold = 14
): Promise<DashboardMetrics> {
  const orgId = context.organizationId;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. Fetch all pipeline stages for this organization
  const stages = await db
    .select()
    .from(schema.pipeline_stages)
    .where(eq(schema.pipeline_stages.organization_id, orgId))
    .orderBy(schema.pipeline_stages.position);

  // 2. Fetch all deals for this organization
  const deals = await db
    .select({
      id: schema.deals.id,
      title: schema.deals.title,
      value: schema.deals.value,
      currency: schema.deals.currency,
      pipeline_stage_id: schema.deals.pipeline_stage_id,
      assigned_to_id: schema.deals.assigned_to_id,
      created_at: schema.deals.created_at,
      updated_at: schema.deals.updated_at,
      assigned_to: {
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
      },
    })
    .from(schema.deals)
    .leftJoin(
      schema.profiles,
      eq(schema.deals.assigned_to_id, schema.profiles.id)
    )
    .where(eq(schema.deals.organization_id, orgId));

  // Stage lookup
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  let totalPipelineValue = 0;
  let openDealsCount = 0;
  let wonRevenue = 0;
  let lostDealsCount = 0;
  let wonDealsCount = 0;

  const stageAggregates = new Map<
    string,
    { count: number; totalValue: number }
  >();

  for (const stage of stages) {
    stageAggregates.set(stage.id, { count: 0, totalValue: 0 });
  }

  for (const deal of deals) {
    const val = parseFloat(deal.value || "0");
    const stage = stageMap.get(deal.pipeline_stage_id);

    if (stage) {
      const agg = stageAggregates.get(stage.id) || { count: 0, totalValue: 0 };
      agg.count += 1;
      agg.totalValue += val;
      stageAggregates.set(stage.id, agg);

      if (stage.is_won) {
        wonRevenue += val;
        wonDealsCount += 1;
      } else if (stage.is_lost) {
        lostDealsCount += 1;
      } else {
        openDealsCount += 1;
        totalPipelineValue += val;
      }
    }
  }

  const closedDealsCount = wonDealsCount + lostDealsCount;
  const conversionRate =
    closedDealsCount > 0 ? (wonDealsCount / closedDealsCount) * 100 : 0;

  // 3. Contacts count & new leads count
  const allContacts = await db
    .select({
      id: schema.contacts.id,
      created_at: schema.contacts.created_at,
    })
    .from(schema.contacts)
    .where(eq(schema.contacts.organization_id, orgId));

  const totalContactsCount = allContacts.length;
  const newLeadsCount30Days = allContacts.filter(
    (c) => new Date(c.created_at) >= thirtyDaysAgo
  ).length;

  // 4. Deals by stage
  const dealsByStage = stages.map((s) => {
    const agg = stageAggregates.get(s.id) || { count: 0, totalValue: 0 };
    return {
      stageId: s.id,
      stageName: s.name,
      stageKey: s.key,
      count: agg.count,
      totalValue: agg.totalValue,
    };
  });

  // 5. Recent activities
  const recentActivities = await db
    .select({
      id: schema.activities.id,
      type: schema.activities.type,
      title: schema.activities.title,
      description: schema.activities.description,
      created_at: schema.activities.created_at,
      userName: schema.profiles.full_name,
    })
    .from(schema.activities)
    .leftJoin(
      schema.profiles,
      eq(schema.activities.user_id, schema.profiles.id)
    )
    .where(eq(schema.activities.organization_id, orgId))
    .orderBy(desc(schema.activities.created_at))
    .limit(10);

  // 6. Stalled deals detection (Section 42)
  // Deal is stalled when open AND no relevant activity for stalledDaysThreshold days
  const openDeals = deals.filter((d) => {
    const stage = stageMap.get(d.pipeline_stage_id);
    return stage && !stage.is_won && !stage.is_lost;
  });

  const stalledCutoff = new Date(
    Date.now() - stalledDaysThreshold * 24 * 60 * 60 * 1000
  );

  // Fetch last activity for each open deal
  const dealActivities = await db
    .select({
      deal_id: schema.activities.deal_id,
      created_at: schema.activities.created_at,
    })
    .from(schema.activities)
    .where(eq(schema.activities.organization_id, orgId))
    .orderBy(desc(schema.activities.created_at));

  const lastActivityByDeal = new Map<string, Date>();
  for (const act of dealActivities) {
    if (act.deal_id && !lastActivityByDeal.has(act.deal_id)) {
      lastActivityByDeal.set(act.deal_id, new Date(act.created_at));
    }
  }

  const stalledDeals = openDeals
    .map((deal) => {
      const lastAct = lastActivityByDeal.get(deal.id) || new Date(deal.created_at);
      const isStalled = lastAct < stalledCutoff;
      if (!isStalled) return null;

      const daysStalled = Math.floor(
        (Date.now() - lastAct.getTime()) / (1000 * 60 * 60 * 24)
      );

      const stage = stageMap.get(deal.pipeline_stage_id);

      return {
        dealId: deal.id,
        title: deal.title,
        value: parseFloat(deal.value || "0"),
        currency: deal.currency,
        stageName: stage?.name || "Unknown",
        ownerName: deal.assigned_to?.full_name || "Unassigned",
        daysStalled,
        lastActivityDate: lastAct,
        recommendedAction:
          daysStalled > 30
            ? "Schedule re-engagement call or mark deal lost"
            : "Send follow-up check-in email to primary contact",
      };
    })
    .filter(Boolean) as DashboardMetrics["stalledDeals"];

  // 7. Rep performance
  const repAggregates = new Map<
    string,
    { repName: string; dealsCount: number; pipelineValue: number; wonValue: number }
  >();

  for (const deal of deals) {
    if (!deal.assigned_to_id || !deal.assigned_to) continue;
    const repId = deal.assigned_to_id;
    const repName = deal.assigned_to.full_name;
    const val = parseFloat(deal.value || "0");
    const stage = stageMap.get(deal.pipeline_stage_id);

    const curr = repAggregates.get(repId) || {
      repName,
      dealsCount: 0,
      pipelineValue: 0,
      wonValue: 0,
    };

    curr.dealsCount += 1;
    if (stage?.is_won) {
      curr.wonValue += val;
    } else if (!stage?.is_lost) {
      curr.pipelineValue += val;
    }

    repAggregates.set(repId, curr);
  }

  const repPerformance = Array.from(repAggregates.entries()).map(
    ([repId, data]) => ({
      repId,
      repName: data.repName,
      dealsCount: data.dealsCount,
      pipelineValue: data.pipelineValue,
      wonValue: data.wonValue,
    })
  );

  return {
    totalPipelineValue,
    openDealsCount,
    wonRevenue,
    lostDealsCount,
    conversionRate: Math.round(conversionRate * 10) / 10,
    totalContactsCount,
    newLeadsCount30Days,
    dealsByStage,
    recentActivities,
    stalledDeals,
    repPerformance,
  };
}
