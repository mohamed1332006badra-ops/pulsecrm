import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import * as relations from "@/db/relations";

// In production runtime, DATABASE_URL must be explicitly set.
// Fallback to local defaults is allowed ONLY in development, test, demo environments,
// or during the Next.js static build phase.
const isProduction = process.env.NODE_ENV === "production";
const isDemo = process.env.DEMO_MODE === "true";
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

if (isProduction && !isDemo && !isBuildPhase && !process.env.DATABASE_URL) {
  throw new Error(
    "[PulseCRM] DATABASE_URL environment variable is required in production runtime. " +
    "Set it to your PostgreSQL connection string before starting the server."
  );
}

// Development / demo fallback: local Supabase instance.
// This default is intentional and documented. Do NOT use in production.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, {
  schema: { ...schema, ...relations },
});

export type DbClient = typeof db;
export { schema };
