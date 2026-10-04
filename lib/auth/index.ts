import { cookies } from "next/headers";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { AuthContext, UserRole } from "@/lib/authorization";
import { AuthenticationError, TenantAccessDeniedError } from "@/lib/errors";

export { DEMO_USERS, type UserSession, type DemoUser } from "./constants";
import { DEMO_USERS, UserSession } from "./constants";

/**
 * Determines whether demo mode is permitted.
 * Critical Security Invariant: Demo mode CANNOT accidentally become active in production.
 */
export function isDemoModeAllowed(
  env: Record<string, string | undefined> = process.env
): boolean {
  // Explicit DEMO_MODE=true always wins — allows intentional staging/demo servers
  // even when next start sets NODE_ENV=production.
  if (env.DEMO_MODE === "true") {
    return true;
  }
  // In production without explicit DEMO_MODE=true: always block demo access.
  if (env.NODE_ENV === "production") {
    return false;
  }
  // In development/test: allow unless explicitly disabled.
  return env.DEMO_MODE !== "false";
}

export type ProductionSessionVerifier = (
  token: string
) => Promise<UserSession | null>;

/**
 * Default production session verifier: checks database for active membership.
 */
export async function defaultProductionSessionVerifier(
  token: string
): Promise<UserSession | null> {
  if (!token || token.trim().length === 0) return null;

  try {
    const memberships = await db
      .select({
        userId: schema.organization_members.user_id,
        role: schema.organization_members.role,
        organizationId: schema.organization_members.organization_id,
        status: schema.organization_members.status,
        userName: schema.profiles.full_name,
        userEmail: schema.profiles.email,
        avatarUrl: schema.profiles.avatar_url,
        orgName: schema.organizations.name,
        orgSlug: schema.organizations.slug,
      })
      .from(schema.organization_members)
      .innerJoin(
        schema.profiles,
        eq(schema.organization_members.user_id, schema.profiles.id)
      )
      .innerJoin(
        schema.organizations,
        eq(schema.organization_members.organization_id, schema.organizations.id)
      )
      .where(
        and(
          eq(schema.organization_members.user_id, token),
          eq(schema.organization_members.status, "active")
        )
      )
      .limit(1);

    if (memberships.length > 0) {
      const m = memberships[0];
      return {
        userId: m.userId,
        email: m.userEmail,
        fullName: m.userName,
        role: m.role,
        organizationId: m.organizationId,
        organizationName: m.orgName,
        organizationSlug: m.orgSlug,
        isDemoMode: false,
        avatarUrl: m.avatarUrl,
      };
    }
  } catch {
    // DB unreachable or query failure -> deny session
    return null;
  }

  return null;
}

/**
 * Pure session resolver for testability and runtime isolation.
 */
export async function resolveUserSession(
  cookieStore: { get: (name: string) => { value?: string } | undefined },
  env: Record<string, string | undefined> = process.env,
  sessionVerifier: ProductionSessionVerifier = defaultProductionSessionVerifier
): Promise<UserSession | null> {
  const isProduction = env.NODE_ENV === "production";
  const demoAllowed = isDemoModeAllowed(env);

  // 1. Check for real production authenticated session
  const productionToken =
    cookieStore.get("pulse_session_token")?.value ||
    cookieStore.get("sb-access-token")?.value;

  if (productionToken) {
    const verifiedSession = await sessionVerifier(productionToken);
    if (verifiedSession) {
      return verifiedSession;
    }
    // Invalid session in production must never fallback to demo
    if (isProduction) {
      return null;
    }
  }

  // 2. Demo User Resolution (strictly disabled in production)
  if (demoAllowed) {
    const demoUserId = cookieStore.get("pulse_demo_user_id")?.value;

    if (demoUserId) {
      const demoUser = DEMO_USERS.find((u) => u.id === demoUserId);
      if (demoUser) {
        const targetOrgCookie = cookieStore.get("pulse_active_org_id")?.value;
        const orgId = targetOrgCookie || demoUser.orgId;

        return {
          userId: demoUser.id,
          email: demoUser.email,
          fullName: demoUser.fullName,
          role: demoUser.role,
          organizationId: orgId,
          organizationName:
            orgId === demoUser.orgId ? demoUser.orgName : "Alternate Org",
          organizationSlug: demoUser.orgSlug,
          isDemoMode: true,
        };
      }
    }

    // Default fallback to first demo user only in development/demo mode
    const defaultDemoUser = DEMO_USERS[0];
    return {
      userId: defaultDemoUser.id,
      email: defaultDemoUser.email,
      fullName: defaultDemoUser.fullName,
      role: defaultDemoUser.role,
      organizationId: defaultDemoUser.orgId,
      organizationName: defaultDemoUser.orgName,
      organizationSlug: defaultDemoUser.orgSlug,
      isDemoMode: true,
    };
  }

  // Production or non-demo without authenticated session: return null
  return null;
}

/**
 * Derives authenticated user context from database session or verified demo context.
 * Never trusts unverified client headers or silently falls back in production.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  return resolveUserSession(cookieStore, process.env);
}

/**
 * Returns typed AuthContext for domain services and authorization checks.
 * Throws AuthenticationError if session is absent or unauthorized.
 */
export async function getAuthContext(
  sessionOverride?: UserSession | null
): Promise<AuthContext> {
  const session =
    sessionOverride !== undefined ? sessionOverride : await getSession();
  if (!session) {
    throw new AuthenticationError("User is not authenticated. Please log in.");
  }

  return {
    userId: session.userId,
    organizationId: session.organizationId,
    role: session.role,
    status: "active",
  };
}

/**
 * Verifies that the user has an active membership in the target organization before switching.
 */
export async function verifyAndSwitchWorkspace(
  userId: string,
  targetOrganizationId: string
): Promise<boolean> {
  const membership = await db
    .select()
    .from(schema.organization_members)
    .where(
      and(
        eq(schema.organization_members.user_id, userId),
        eq(schema.organization_members.organization_id, targetOrganizationId),
        eq(schema.organization_members.status, "active")
      )
    )
    .limit(1);

  if (membership.length === 0) {
    throw new TenantAccessDeniedError(
      "You do not have an active membership in this workspace."
    );
  }

  return true;
}
