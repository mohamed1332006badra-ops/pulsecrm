import React from "react";
import { getAuthContext } from "@/lib/auth";
import { canManageApiKeys } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Terminal, ShieldCheck, Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const context = await getAuthContext();

  if (!canManageApiKeys(context)) {
    redirect("/");
  }

  const keys = await db
    .select({
      id: schema.api_keys.id,
      name: schema.api_keys.name,
      key_prefix: schema.api_keys.key_prefix,
      created_at: schema.api_keys.created_at,
      expires_at: schema.api_keys.expires_at,
      revoked_at: schema.api_keys.revoked_at,
      last_used_at: schema.api_keys.last_used_at,
    })
    .from(schema.api_keys)
    .where(eq(schema.api_keys.organization_id, context.organizationId))
    .orderBy(desc(schema.api_keys.created_at));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Keys & Webhook Security
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage cryptographically hashed API keys for inbound lead ingestion webhooks
        </p>
      </div>

      <ApiKeysManager initialKeys={keys} />

      {/* Webhook HMAC Documentation & Curl Reference */}
      <Card>
        <CardHeader className="p-5 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Inbound Lead Webhook Integration Contract
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Endpoint: <code className="font-mono text-foreground font-bold">POST /api/v1/leads/webhook</code>
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-2 text-xs space-y-3">
          <p className="text-muted-foreground">
            Inbound leads require HMAC-SHA256 signature verification computed over <code className="font-mono bg-muted px-1 py-0.5 rounded">timestamp + &quot;.&quot; + raw_body</code>.
          </p>

          <div className="rounded-md bg-muted/60 p-3 font-mono text-[11px] text-foreground space-y-1 overflow-x-auto border">
            <p className="text-muted-foreground"># Example Curl Command with HMAC signature:</p>
            <p>curl -X POST https://your-domain.com/api/v1/leads/webhook \</p>
            <p className="pl-4">-H &quot;Authorization: Bearer YOUR_RAW_API_KEY&quot; \</p>
            <p className="pl-4">-H &quot;X-Signature: YOUR_COMPUTED_HMAC_SHA256&quot; \</p>
            <p className="pl-4">-H &quot;X-Timestamp: 1791158400&quot; \</p>
            <p className="pl-4">-H &quot;Idempotency-Key: lead_unique_12345&quot; \</p>
            <p className="pl-4">-H &quot;Content-Type: application/json&quot; \</p>
            <p className="pl-4">-d &apos;{JSON.stringify({ name: "Ahmed Soliman", phone: "+201004567890", email: "a.soliman@cairoheavy.com", companyName: "Cairo Heavy Equipment", estimatedValue: 125000 })}&apos;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
