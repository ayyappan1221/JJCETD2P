import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components, borrowingRequests, issueRecords, notifications } from "@/lib/db/schema";
import { eq, and, lt, or, sql, desc, count } from "drizzle-orm";
import { auth } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = (session.user as any).roles || [];
  const isStudent = !roles.some((r: string) => ["ADMIN", "D2P_INCHARGE"].includes(r));
  const userId = (session.user as any).id;

  const now = new Date();

  const [
    totalComponentsResult,
    totalAvailableResult,
    totalIssuedResult,
    pendingRequestsResult,
    approvedAwaitingResult,
    activeTransactionsResult,
    overdueResult,
    lowStockResult,
    recentRequests,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(components).where(eq(components.isActive, true)),
    db.select({ total: sql<number>`coalesce(sum(${components.availableQuantity}), 0)` }).from(components),
    db.select({ total: sql<number>`coalesce(sum(${components.issuedQuantity}), 0)` }).from(components),
    db.select({ count: sql<number>`count(*)` }).from(borrowingRequests).where(isStudent ? and(eq(borrowingRequests.status, "PENDING"), eq(borrowingRequests.studentId, userId)) : eq(borrowingRequests.status, "PENDING")),
    db.select({ count: sql<number>`count(*)` }).from(borrowingRequests).where(isStudent ? and(eq(borrowingRequests.status, "APPROVED"), eq(borrowingRequests.studentId, userId)) : eq(borrowingRequests.status, "APPROVED")),
    db.select({ count: sql<number>`count(*)` }).from(issueRecords).where(
      or(eq(issueRecords.status, "ACTIVE"), eq(issueRecords.status, "PARTIALLY_RETURNED"))
    ),
    db.select({ count: sql<number>`count(*)` }).from(issueRecords).where(
      and(
        or(eq(issueRecords.status, "ACTIVE"), eq(issueRecords.status, "PARTIALLY_RETURNED")),
        lt(issueRecords.expectedReturnDate, now)
      )
    ),
    db.select({ count: sql<number>`count(*)` }).from(components).where(
      and(eq(components.isActive, true), sql`${components.availableQuantity} <= ${components.minStockThreshold}`, sql`${components.totalQuantity} > 0`, sql`${components.minStockThreshold} > 0`)
    ),
    db.query.borrowingRequests.findMany({
      where: isStudent ? eq(borrowingRequests.studentId, userId) : undefined,
      with: { student: true, component: true },
      limit: 5,
      orderBy: [desc(borrowingRequests.createdAt)],
    }),
  ]);

  const stats = {
    totalComponents: Number(totalComponentsResult[0]?.count || 0),
    totalAvailable: Number(totalAvailableResult[0]?.total || 0),
    totalIssued: Number(totalIssuedResult[0]?.total || 0),
    pendingRequests: Number(pendingRequestsResult[0]?.count || 0),
    approvedAwaitingIssue: Number(approvedAwaitingResult[0]?.count || 0),
    activeTransactions: Number(activeTransactionsResult[0]?.count || 0),
    overdueTransactions: Number(overdueResult[0]?.count || 0),
    lowStockComponents: Number(lowStockResult[0]?.count || 0),
    recentActivity: recentRequests.map((r: any) => ({
      id: r.id,
      reference: r.reference,
      studentName: r.student?.fullName,
      componentName: r.component?.name,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };

  return NextResponse.json(stats);
}
