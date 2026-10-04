import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";

/**
 * PulseCRM Database Migration Runner
 *
 * Applies all pending Drizzle ORM SQL migrations from the ./db/migrations directory.
 * Run with: npm run db:migrate
 *
 * Safety properties:
 * - Idempotent: migrations already applied are tracked in __drizzle_migrations table
 * - Atomic: each migration runs in a transaction; failure rolls back
 * - Safe for CI: exits with code 1 on failure
 */
async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  // Use a dedicated migration client (not the pooled connection)
  const migrationClient = postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  const db = drizzle(migrationClient);

  console.log("🔄 PulseCRM — Running database migrations...");
  console.log(`   DSN: ${connectionString.replace(/:([^:@]+)@/, ":***@")}`);

  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "db", "migrations"),
    });

    console.log("✅ Migrations completed successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
