import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { borrowingRequests, components } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { createNotification } from "@/services/notifications";
import { z } from "zod";

const approvalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE", "LAB_STAFF");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = approvalSchema.parse(body);

    const request = await db.query.borrowingRequests.findFirst({
      where: eq(borrowingRequests.id, id),
      with: { student: true, component: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if ((request as any).status !== "PENDING") {
      return NextResponse.json(
        { error: `Request is already ${(request as any).status}` },
        { status: 400 }
      );
    }

    const newStatus = parsed.action === "approve" ? "APPROVED" : "REJECTED";

    if (parsed.action === "reject" && !parsed.rejectionReason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(borrowingRequests)
      .set({
        status: newStatus as any,
        decisionById: (session!.user as any).id,
        decisionAt: new Date(),
        rejectionReason: parsed.action === "reject" ? parsed.rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(borrowingRequests.id, id))
      .returning();

    // Notify student
    await createNotification({
      recipientId: (request as any).studentId,
      type: parsed.action === "approve" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
      title: parsed.action === "approve" ? "Request Approved" : "Request Rejected",
      message:
        parsed.action === "approve"
          ? `Your request for ${(request as any).component?.name} has been approved`
          : `Your request for ${(request as any).component?.name} was rejected: ${parsed.rejectionReason}`,
      relatedEntityType: "borrowing_request",
      relatedEntityId: id,
      dedupeKey: `request_${parsed.action}d_${id}`,
    });

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: `BORROWING_REQUEST_${parsed.action.toUpperCase()}D`,
      entityType: "borrowing_request",
      entityId: id,
      before: request,
      after: updated,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error("Approval error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
