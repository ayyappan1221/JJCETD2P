import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export type Role = "ADMIN" | "D2P_INCHARGE" | "STUDENT";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireRole(...allowedRoles: Role[]) {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const roles = (session.user as any).roles || [];
  if (!allowedRoles.some((r) => roles.includes(r))) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}

export function hasRole(session: any, ...roles: Role[]): boolean {
  const userRoles = session?.user?.roles || [];
  return roles.some((r) => userRoles.includes(r));
}

export function isAdmin(session: any): boolean {
  return hasRole(session, "ADMIN");
}

export function isStaffOrAbove(session: any): boolean {
  return hasRole(session, "ADMIN", "D2P_INCHARGE", "D2P_INCHARGE");
}
