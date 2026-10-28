import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { borrowingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const request = await db.query.borrowingRequests.findFirst({
    where: eq(borrowingRequests.id, id),
    with: { student: true, component: true, decisionBy: true },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Students can only view their own
  const roles = (session.user as any).roles || [];
  const isAdminOrStaff = roles.some((r: string) =>
    ["ADMIN", "D2P_INCHARGE"].includes(r)
  );
  if (!isAdminOrStaff && (request as any).studentId !== (session.user as any).id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(request);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const request = await db.query.borrowingRequests.findFirst({
    where: eq(borrowingRequests.id, id),
  });
  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Cancel request (student can cancel pending, staff can cancel pending/approved)
  if (body.action === "cancel") {
    const roles = (session.user as any).roles || [];
    const isAdminOrStaff = roles.some((r: string) =>
      ["ADMIN", "D2P_INCHARGE"].includes(r)
    );
    const isOwner = (request as any).studentId === (session.user as any).id;

    if (!isAdminOrStaff && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["PENDING", "APPROVED"].includes((request as any).status)) {
      return NextResponse.json({ error: "Cannot cancel request in current status" }, { status: 400 });
    }

    const [updated] = await db
      .update(borrowingRequests)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(borrowingRequests.id, id))
      .returning();

    await createAuditLog({
      actorId: (session.user as any).id,
      action: "BORROWING_REQUEST_CANCELLED",
      entityType: "borrowing_request",
      entityId: id,
      before: request,
      after: updated,
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
