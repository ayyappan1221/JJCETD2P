import { auth } from "@/lib/auth/edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/api/v1/health", "/api/v1/seed", "/api/v1/signup"];

const ADMIN_ONLY = ["/users", "/settings", "/categories", "/audit-logs"];
const INCHARGE_OR_ADMIN = ["/approvals", "/returns", "/stock", "/overdue", "/reports"];

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

  // Check role-based access for specific pages
  if (ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    if (!roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }
  }
  if (INCHARGE_OR_ADMIN.some((p) => pathname.startsWith(p))) {
    if (!roles.some((r: string) => ["ADMIN", "D2P_INCHARGE"].includes(r))) {
      return NextResponse.redirect(new URL("/access-denied", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
