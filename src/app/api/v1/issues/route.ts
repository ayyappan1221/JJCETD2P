import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueRecords, borrowingRequests, components, stockMovements } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { createNotification } from "@/services/notifications";
import { generateReference } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const studentId = searchParams.get("studentId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const roles = (session.user as any).roles || [];
  const isAdminOrStaff = roles.some((r: string) =>
    ["ADMIN", "D2P_INCHARGE"].includes(r)
  );

  const conditions: any[] = [];
  if (status) conditions.push(eq(issueRecords.status, status as any));
  if (studentId) conditions.push(eq(issueRecords.studentId, studentId));
  if (!isAdminOrStaff) {
    conditions.push(eq(issueRecords.studentId, (session.user as any).id));
  }

  const { and } = await import("drizzle-orm");
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.issueRecords.findMany({
    where,
    with: { student: true, component: true, issuedBy: true, returns: true },
    limit: pageSize,
    offset,
    orderBy: (t, { desc }) => [desc(t.issuedAt)],
  });

  const { sql: sqlFn } = await import("drizzle-orm");
  const countResult = await db
    .select({ count: sqlFn<number>`count(*)` })
    .from(issueRecords)
    .where(where);
  const total = Number(countResult[0]?.count || 0);

  const mapped = data.map((r: any) => {
    const totalReturned = (r.returns || []).reduce(
      (sum: number, ret: any) => sum + ret.quantity,
      0
    );
    return {
      id: r.id,
      reference: r.reference,
      requestId: r.requestId,
      studentId: r.studentId,
      studentName: r.student?.fullName,
      componentId: r.componentId,
      componentName: r.component?.name,
      componentCode: r.component?.code,
      quantityIssued: r.quantityIssued,
      issuedById: r.issuedById,
      issuedByName: r.issuedBy?.fullName,
      issuedAt: r.issuedAt,
      expectedReturnDate: r.expectedReturnDate,
      status: r.status,
      totalReturned,
      outstanding: r.quantityIssued - totalReturned,
    };
  });

  return NextResponse.json({
    data: mapped,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  try {
    const body = await req.json();
    const requestId = body.requestId;

    // Fetch and validate the approved request
    const request = await db.query.borrowingRequests.findFirst({
      where: eq(borrowingRequests.id, requestId),
      with: { student: true, component: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if ((request as any).status !== "APPROVED") {
      return NextResponse.json(
        { error: `Request must be APPROVED to issue. Current status: ${(request as any).status}` },
        { status: 400 }
      );
    }

    const component = (request as any).component;
    const quantity = (request as any).quantity;

    // Atomic transaction: check stock, decrement, create issue record, create movement, update request
    const result = await db.transaction(async (tx) => {
      // Atomic conditional update: decrement available, increment issued
      const updateResult = await tx
        .update(components)
        .set({
          availableQuantity: sql`${components.availableQuantity} - ${quantity}`,
          issuedQuantity: sql`${components.issuedQuantity} + ${quantity}`,
          updatedAt: new Date(),
        })
        .where(
          sql`${components.id} = ${component.id} AND ${components.availableQuantity} >= ${quantity} AND ${components.isActive} = true`
        )
        .returning();

      if (updateResult.length === 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // Create issue record
      const issueRef = generateReference("IS");
      const [issue] = await tx
        .insert(issueRecords)
        .values({
          reference: issueRef,
          requestId,
          studentId: (request as any).studentId,
          componentId: component.id,
          quantityIssued: quantity,
          issuedById: (session!.user as any).id,
          expectedReturnDate: (request as any).requestedReturnDate,
          status: "ACTIVE",
        })
        .returning();

      // Create stock movement
      const movementRef = generateReference("SM");
      await tx.insert(stockMovements).values({
        reference: movementRef,
        componentId: component.id,
        type: "ISSUE",
        quantityDelta: -quantity,
        reason: `Issued for request ${(request as any).reference}`,
        performedById: (session!.user as any).id,
        relatedIssueId: issue.id,
      });

      // Update request status to ISSUED
      await tx
        .update(borrowingRequests)
        .set({ status: "ISSUED", updatedAt: new Date() })
        .where(eq(borrowingRequests.id, requestId));

      return issue;
    });

    // Notify student
    await createNotification({
      recipientId: (request as any).studentId,
      type: "COMPONENT_ISSUED",
      title: "Component Issued",
      message: `${quantity}x ${component.name} has been issued. Return by ${new Date((request as any).requestedReturnDate).toLocaleDateString()}`,
      relatedEntityType: "issue_record",
      relatedEntityId: result.id,
      dedupeKey: `component_issued_${result.id}`,
    });

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: "COMPONENT_ISSUED",
      entityType: "issue_record",
      entityId: result.id,
      after: result,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Insufficient stock available" }, { status: 409 });
    }
    if (err.code === "23505") {
      return NextResponse.json({ error: "Request already issued" }, { status: 409 });
    }
    console.error("Issue error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
