import { sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export interface AssignedSalesRep {
  id: string;
  full_name: string;
  email: string;
}

/**
 * Concurrency-Safe Round-Robin Sales Representative Assignment
 * 
 * Uses PostgreSQL row-level locking (`FOR UPDATE OF p`) within the enclosing transaction
 * to select the active sales rep who was least recently assigned a lead.
 * 
 * Guarantees that concurrent webhook lead ingestions will not race or assign
 * the same representative in violation of round-robin distribution.
 */
export async function assignNextSalesRep(
  organizationId: string,
  tx: any
): Promise<AssignedSalesRep | null> {
  // Query active sales representatives, ordered by oldest assignment timestamp (NULLS FIRST)
  // Lock the selected profile row with FOR UPDATE to prevent race conditions.
  const query = sql`
    SELECT p.id, p.full_name, p.email, p.last_lead_assigned_at
    FROM ${schema.profiles} p
    INNER JOIN ${schema.organization_members} om ON om.user_id = p.id
    WHERE om.organization_id = ${organizationId}
      AND om.status = 'active'
      AND om.role IN ('sales_rep', 'admin', 'owner')
    ORDER BY p.last_lead_assigned_at ASC NULLS FIRST
    LIMIT 1
    FOR UPDATE OF p
  `;

  const result = await tx.execute(query);
  const rows = (result.rows || result) as Array<{
    id: string;
    full_name: string;
    email: string;
  }>;

  if (!rows || rows.length === 0) {
    return null;
  }

  const selectedRep = rows[0];

  // Update last_lead_assigned_at timestamp atomically within the same transaction
  await tx
    .update(schema.profiles)
    .set({
      last_lead_assigned_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(schema.profiles.id, selectedRep.id));

  return {
    id: selectedRep.id,
    full_name: selectedRep.full_name,
    email: selectedRep.email,
  };
}
