import { describe, it, expect, vi } from "vitest";
import {
  isDemoModeAllowed,
  resolveUserSession,
  getAuthContext,
  UserSession,
} from "@/lib/auth";
import { AuthenticationError } from "@/lib/errors";

describe("Production Authentication & Demo Mode Hardening", () => {
  const mockValidUserSession: UserSession = {
    userId: "u-prod-999",
    email: "sarah.connor@enterprisecorp.com",
    fullName: "Sarah Connor",
    role: "admin",
    organizationId: "org-prod-111",
    organizationName: "Enterprise Corp",
    organizationSlug: "enterprise-corp",
    isDemoMode: false,
    avatarUrl: null,
  };

  const createMockCookieStore = (cookies: Record<string, string> = {}) => ({
    get: (name: string) => {
      const val = cookies[name];
      return val !== undefined ? { value: val } : undefined;
    },
  });

  describe("1. Production + no session → unauthorized", () => {
    it("returns null when no session token exists in production", async () => {
      const emptyCookies = createMockCookieStore({});
      const env = { NODE_ENV: "production" };

      const session = await resolveUserSession(emptyCookies, env);
      expect(session).toBeNull();
    });

    it("throws AuthenticationError in getAuthContext when session is null", async () => {
      await expect(getAuthContext(null)).rejects.toThrow(AuthenticationError);
      await expect(getAuthContext(null)).rejects.toThrow(
        "User is not authenticated"
      );
    });
  });

  describe("2. Production + invalid session → unauthorized", () => {
    it("rejects invalid/expired production tokens without falling back to demo", async () => {
      const cookies = createMockCookieStore({
        pulse_session_token: "invalid-or-expired-token",
      });
      const env = { NODE_ENV: "production" };
      const mockVerifier = vi.fn().mockResolvedValue(null);

      const session = await resolveUserSession(cookies, env, mockVerifier);

      expect(mockVerifier).toHaveBeenCalledWith("invalid-or-expired-token");
      expect(session).toBeNull();
      await expect(getAuthContext(session)).rejects.toThrow(AuthenticationError);
    });
  });

  describe("3. Production + valid session → correct AuthContext", () => {
    it("resolves valid production session and produces correct AuthContext", async () => {
      const cookies = createMockCookieStore({
        pulse_session_token: "valid-secure-session-token",
      });
      const env = { NODE_ENV: "production" };
      const mockVerifier = vi.fn().mockResolvedValue(mockValidUserSession);

      const session = await resolveUserSession(cookies, env, mockVerifier);

      expect(session).not.toBeNull();
      expect(session?.isDemoMode).toBe(false);
      expect(session?.userId).toBe("u-prod-999");
      expect(session?.organizationId).toBe("org-prod-111");

      const authContext = await getAuthContext(session);
      expect(authContext).toEqual({
        userId: "u-prod-999",
        organizationId: "org-prod-111",
        role: "admin",
        status: "active",
      });
    });
  });

  describe("4. Demo mode + no session → demo context is allowed in non-production", () => {
    it("allows default demo user in development when no cookies are provided", async () => {
      const cookies = createMockCookieStore({});
      const env = { NODE_ENV: "development", DEMO_MODE: "true" };

      const session = await resolveUserSession(cookies, env);

      expect(session).not.toBeNull();
      expect(session?.isDemoMode).toBe(true);
      expect(session?.organizationSlug).toBe("apex-industrial");

      const authContext = await getAuthContext(session);
      expect(authContext.status).toBe("active");
      expect(authContext.role).toBe("owner");
    });

    it("resolves specific demo persona when pulse_demo_user_id is set in development", async () => {
      const cookies = createMockCookieStore({
        pulse_demo_user_id: "00000000-0000-0000-0000-000000000003", // Omar Farooq, sales_rep
      });
      const env = { NODE_ENV: "development" };

      const session = await resolveUserSession(cookies, env);

      expect(session).not.toBeNull();
      expect(session?.email).toBe("omar@apexsupplies.com");
      expect(session?.role).toBe("sales_rep");
    });
  });

  describe("5. Demo mode security: explicit opt-in vs accidental activation", () => {
    it("blocks demo mode in production when DEMO_MODE is not set", () => {
      expect(isDemoModeAllowed({ NODE_ENV: "production" })).toBe(false);
      expect(
        isDemoModeAllowed({ NODE_ENV: "production", DEMO_MODE: "false" })
      ).toBe(false);
    });

    it("allows demo mode in production when DEMO_MODE=true is explicitly set (intentional staging server)", () => {
      expect(
        isDemoModeAllowed({ NODE_ENV: "production", DEMO_MODE: "true" })
      ).toBe(true);
    });

    it("ignores pulse_demo_user_id cookie in production without DEMO_MODE=true and returns null", async () => {
      const cookiesWithDemoCookie = createMockCookieStore({
        pulse_demo_user_id: "00000000-0000-0000-0000-000000000001",
      });
      const env = { NODE_ENV: "production" }; // no DEMO_MODE=true

      const session = await resolveUserSession(cookiesWithDemoCookie, env);

      expect(session).toBeNull();
      await expect(getAuthContext(session)).rejects.toThrow(AuthenticationError);
    });

    it("resolves demo session in production when DEMO_MODE=true is explicitly set", async () => {
      const cookies = createMockCookieStore({
        pulse_demo_user_id: "00000000-0000-0000-0000-000000000001",
      });
      const env = { NODE_ENV: "production", DEMO_MODE: "true" };

      const session = await resolveUserSession(cookies, env);

      // Explicit DEMO_MODE=true allows demo even under next start (production build)
      expect(session).not.toBeNull();
      expect(session?.isDemoMode).toBe(true);
    });
  });
});
