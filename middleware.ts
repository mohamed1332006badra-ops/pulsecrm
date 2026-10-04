import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware: Authentication Guard & Tenant Isolation
 *
 * Protects all dashboard routes by verifying session cookie presence.
 * In demo mode: always allows access (demo session is derived server-side).
 * In production: redirects to /login if no valid session cookie exists.
 *
 * Security: Does NOT perform full session validation here (expensive DB call).
 * Full validation occurs in getAuthContext() on each server component/action.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that never require auth
  const publicPaths = [
    "/login",
    "/signup",
    "/api/v1/leads/webhook", // External webhook — uses HMAC signature auth
    "/api/health",
    "/_next",
    "/favicon.ico",
  ];

  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  // Check for demo session cookie
  const demoUserId = request.cookies.get("pulse_demo_user_id")?.value;

  if (demoUserId) {
    // Demo session is valid — allow through. Actual validation in server components.
    return NextResponse.next();
  }

  // In demo mode (default dev behavior), redirect to login with return URL
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - files with extensions (assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
