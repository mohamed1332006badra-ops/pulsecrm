"use client";

import React, { useState } from "react";
import { Key, Plus, Copy, Check, ShieldAlert, Trash2, Clock, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/actions/api-keys";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  created_at: Date | string;
  expires_at: Date | string | null;
  revoked_at: Date | string | null;
  last_used_at: Date | string | null;
}

interface ApiKeysManagerProps {
  initialKeys: ApiKeyItem[];
}

export function ApiKeysManager({ initialKeys }: ApiKeysManagerProps) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // One-time reveal modal state
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const result = await createApiKeyAction(name.trim(), 90);
    setLoading(false);

    if (result.success && result.apiKey) {
      setKeys((prev) => [
        {
          id: result.apiKey.id,
          name: result.apiKey.name,
          key_prefix: result.apiKey.keyPrefix,
          created_at: new Date(),
          expires_at: result.apiKey.expiresAt,
          revoked_at: null,
          last_used_at: null,
        },
        ...prev,
      ]);

      setDialogOpen(false);
      setName("");
      setRevealedKey(result.apiKey.rawSecret);
      setCopied(false);

      toast({
        title: "API Key Created",
        description: "Save this key immediately. You will not be able to view it again.",
        type: "success",
      });
    } else {
      toast({
        title: "Key Generation Failed",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke API key "${keyName}"? Any integrated webhooks using this key will immediately fail.`)) {
      return;
    }

    const result = await revokeApiKeyAction(keyId);
    if (result.success) {
      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, revoked_at: new Date() } : k))
      );
      toast({
        title: "API Key Revoked",
        description: `Key "${keyName}" was successfully invalidated.`,
        type: "success",
      });
    } else {
      toast({
        title: "Revocation Failed",
        description: result.error,
        type: "error",
      });
    }
  };

  const handleCopySecret = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    toast({
      title: "Secret Copied",
      description: "API key secret copied to clipboard.",
      type: "success",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 pb-2 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active API Keys ({keys.length})
            </CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="text-xs h-7 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate New Key</span>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {keys.map((k) => {
              const isRevoked = !!k.revoked_at;
              const isExpired = k.expires_at && new Date() > new Date(k.expires_at);

              return (
                <div
                  key={k.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {k.name}
                      </span>
                      {isRevoked ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Revoked
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="warning" className="text-[10px]">
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground mt-1 font-mono text-[11px]">
                      <span>Prefix: {k.key_prefix}...</span>
                      <span>•</span>
                      <span>Created: {formatDate(k.created_at)}</span>
                      {k.last_used_at && (
                        <>
                          <span>•</span>
                          <span>Last Used: {formatRelativeTime(k.last_used_at)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {!isRevoked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(k.id, k.name)}
                      className="text-xs h-7 gap-1 text-destructive hover:bg-destructive/10 border-destructive/30 self-start sm:self-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Revoke Key</span>
                    </Button>
                  )}
                </div>
              );
            })}

            {keys.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No API keys generated yet. Click &quot;Generate New Key&quot; to authenticate webhooks.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Creation Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>Generate Ingestion API Key</DialogTitle>
          <DialogDescription>
            API keys allow external systems to ingest leads via signed HMAC webhooks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateKey} className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-foreground block mb-1">
              Key Name / Purpose *
            </label>
            <Input
              placeholder="e.g. Website Marketing Form Ingestion"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Key"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Reveal Once Secret Modal */}
      <Dialog
        open={!!revealedKey}
        onOpenChange={(open) => !open && setRevealedKey(null)}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <ShieldAlert className="h-5 w-5" />
            <DialogTitle>Save Your API Key Secret</DialogTitle>
          </div>
          <DialogDescription>
            This is the ONLY time this secret will be revealed. For security, we store only cryptographic hashes and cannot recover it later.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-md bg-muted font-mono text-xs break-all border flex items-center justify-between gap-2 select-all">
          <span>{revealedKey}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopySecret}
            className="h-7 px-2 shrink-0 gap-1 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={() => setRevealedKey(null)}>
            I Have Saved This Key
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
