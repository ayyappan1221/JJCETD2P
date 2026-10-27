import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueRecords } from "@/lib/db/schema";
import { eq, and, lt, or, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const now = new Date();

  const data = await db.query.issueRecords.findMany({
    where: and(
      or(
        eq(issueRecords.status, "ACTIVE"),
        eq(issueRecords.status, "PARTIALLY_RETURNED")
      ),
      lt(issueRecords.expectedReturnDate, now)
    ),
    with: { student: true, component: true, issuedBy: true, returns: true },
    limit: pageSize,
    offset,
    orderBy: [desc(issueRecords.expectedReturnDate)],
  });

  const mapped = data.map((r: any) => {
    const totalReturned = (r.returns || []).reduce(
      (sum: number, ret: any) => sum + ret.quantity,
      0
    );
    const overdueDays = Math.floor(
      (now.getTime() - new Date(r.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      id: r.id,
      reference: r.reference,
      studentId: r.studentId,
      studentName: r.student?.fullName,
      studentEmail: r.student?.email,
      componentId: r.componentId,
      componentName: r.component?.name,
      componentCode: r.component?.code,
      quantityIssued: r.quantityIssued,
      outstanding: r.quantityIssued - totalReturned,
      issuedAt: r.issuedAt,
      expectedReturnDate: r.expectedReturnDate,
      overdueDays,
      status: r.status,
    };
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(issueRecords)
    .where(
      and(
        or(
          eq(issueRecords.status, "ACTIVE"),
          eq(issueRecords.status, "PARTIALLY_RETURNED")
        ),
        lt(issueRecords.expectedReturnDate, now)
      )
    );

  const total = Number(countResult[0]?.count || 0);

  return NextResponse.json({
    data: mapped,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
