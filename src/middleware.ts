import { auth } from "@/lib/auth/edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/api/v1/health", "/api/v1/seed", "/api/v1/signup"];

const ROLE_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/staff": ["ADMIN", "D2P_INCHARGE", "LAB_STAFF"],
  "/student": ["ADMIN", "D2P_INCHARGE", "LAB_STAFF", "STUDENT"],
  "/incharge": ["ADMIN", "D2P_INCHARGE"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Require authentication
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const roles = (req.auth.user as any)?.roles || [];

  // Check role-based access
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!allowedRoles.some((r) => roles.includes(r))) {
        return NextResponse.redirect(new URL("/access-denied", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
