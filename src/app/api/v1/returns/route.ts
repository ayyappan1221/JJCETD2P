import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { returnRecords, issueRecords, components, stockMovements } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
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
  const issueId = searchParams.get("issueId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (issueId) conditions.push(eq(returnRecords.issueId, issueId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.returnRecords.findMany({
    where,
    with: { issue: { with: { student: true, component: true } }, receivedBy: true },
    limit: pageSize,
    offset,
    orderBy: (t, { desc }) => [desc(t.returnedAt)],
  });

  return NextResponse.json({ data, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE", "LAB_STAFF");
  if (error) return error;

  try {
    const body = await req.json();
    const { issueId, quantity, notes } = body;

    if (!issueId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const issue = await db.query.issueRecords.findFirst({
      where: eq(issueRecords.id, issueId),
      with: { component: true, student: true, returns: true },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue record not found" }, { status: 404 });
    }

    if ((issue as any).status === "RETURNED") {
      return NextResponse.json({ error: "Issue already fully returned" }, { status: 400 });
    }

    const totalReturned = ((issue as any).returns || []).reduce(
      (sum: number, r: any) => sum + r.quantity,
      0
    );
    const outstanding = (issue as any).quantityIssued - totalReturned;

    if (quantity > outstanding) {
      return NextResponse.json(
        { error: `Return quantity (${quantity}) exceeds outstanding (${outstanding})` },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // Create return record
      const returnRef = generateReference("RT");
      const [returnRecord] = await tx
        .insert(returnRecords)
        .values({
          reference: returnRef,
          issueId,
          quantity,
          receivedById: (session!.user as any).id,
          notes: notes || null,
        })
        .returning();

      // Update component stock: increment available, decrement issued
      await tx
        .update(components)
        .set({
          availableQuantity: sql`${components.availableQuantity} + ${quantity}`,
          issuedQuantity: sql`${components.issuedQuantity} - ${quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(components.id, (issue as any).componentId));

      // Create stock movement
      const movementRef = generateReference("SM");
      await tx.insert(stockMovements).values({
        reference: movementRef,
        componentId: (issue as any).componentId,
        type: "RETURN",
        quantityDelta: quantity,
        reason: `Return for issue ${(issue as any).reference}`,
        performedById: (session!.user as any).id,
        relatedIssueId: issueId,
      });

      // Update issue status
      const newTotalReturned = totalReturned + quantity;
      const newStatus =
        newTotalReturned >= (issue as any).quantityIssued
          ? "RETURNED"
          : "PARTIALLY_RETURNED";

      await tx
        .update(issueRecords)
        .set({ status: newStatus as any, updatedAt: new Date() })
        .where(eq(issueRecords.id, issueId));

      return returnRecord;
    });

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: "COMPONENT_RETURNED",
      entityType: "return_record",
      entityId: result.id,
      after: result,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("Return error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
