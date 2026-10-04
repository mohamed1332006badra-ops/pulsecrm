import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateRequestId } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  let dbStatus = "healthy";
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: any) {
    dbStatus = "unreachable";
    dbError = err?.message || "Database connection error";
  }

  const isHealthy = dbStatus === "healthy";
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
      requestId,
      uptimeSeconds: Math.floor(process.uptime()),
      durationMs: Date.now() - startTime,
      dependencies: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError } : {}),
        },
      },
    },
    { status: statusCode }
  );
}
