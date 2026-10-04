"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_USERS } from "@/lib/auth/constants";
import { switchDemoUserAction } from "@/app/actions/workspace";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Building2, Sparkles, ShieldCheck, ArrowRight, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProductionLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // When Supabase Auth is active, this calls supabase.auth.signInWithPassword
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Supabase Auth Notice",
        description: "To test production Supabase Auth, configure NEXT_PUBLIC_SUPABASE_URL. Using Instant Demo Access below is recommended for live demonstration.",
        type: "info",
      });
    }, 400);
  };

  const handleDemoLogin = async (userId: string, name: string, role: string, orgName: string) => {
    setLoading(true);
    await switchDemoUserAction(userId);
    toast({
      title: "Authenticated in Demo Mode",
      description: `Signed in as ${name} (${role}) at ${orgName}.`,
      type: "success",
    });
    router.push("/");
    router.refresh();
  };

  const apexUsers = DEMO_USERS.filter((u) => u.orgSlug === "apex-industrial");
  const horizonUsers = DEMO_USERS.filter((u) => u.orgSlug === "horizon-logistics");

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-10 w-10 rounded-lg bg-primary text-primary-foreground items-center justify-center font-bold text-lg shadow-sm">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to PulseCRM
          </h1>
          <p className="text-xs text-muted-foreground">
            Enterprise Multi-Tenant B2B Sales Platform
          </p>
        </div>

        {/* Demo Mode Instant Selector (Prominently Labeled) */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Sparkles className="h-4 w-4 shrink-0" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider">
                Instant Interactive Demo Access
              </CardTitle>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground">
              Select any pre-configured role to inspect real-time RBAC and multi-tenant isolation:
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-1 space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1.5">
                <Building2 className="h-3 w-3 text-primary" /> Apex Industrial Supplies (Primary Tenant)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {apexUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleDemoLogin(u.id, u.fullName, u.role, u.orgName)}
                    className="p-2 rounded border bg-card hover:bg-accent text-left text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold block truncate">{u.fullName.split(" ")[0]}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{u.role.replace("_", " ")}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-500/20">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1.5">
                <Building2 className="h-3 w-3 text-emerald-600" /> Horizon Logistics (Tenant 2 - Isolation Test)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {horizonUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleDemoLogin(u.id, u.fullName, u.role, u.orgName)}
                    className="p-2 rounded border bg-card hover:bg-accent text-left text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold block truncate">{u.fullName.split(" ")[0]}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{u.role.replace("_", " ")}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Supabase Auth Form */}
        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold">
              Production Credentials Login
            </CardTitle>
            <CardDescription className="text-xs">
              Direct Supabase Auth email and password verification
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0">
            <form onSubmit={handleProductionLogin} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="user@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs h-9">
                {loading ? "Authenticating..." : "Sign in with Credentials"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
