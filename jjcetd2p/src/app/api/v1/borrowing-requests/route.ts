import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { borrowingRequests, components, profiles } from "@/lib/db/schema";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { requireRole, requireAuth } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { createNotification } from "@/services/notifications";
import { z } from "zod";
import { generateReference } from "@/lib/utils";

const createSchema = z.object({
  componentId: z.string().uuid(),
  quantity: z.number().int().positive(),
  purpose: z.string().optional(),
  requestedReturnDate: z.string().datetime(),
});

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
    ["ADMIN", "D2P_INCHARGE", "LAB_STAFF"].includes(r)
  );

  const conditions: any[] = [];
  if (status) conditions.push(eq(borrowingRequests.status, status as any));
  if (studentId) conditions.push(eq(borrowingRequests.studentId, studentId));
  // Students can only see their own requests
  if (!isAdminOrStaff) {
    conditions.push(eq(borrowingRequests.studentId, (session.user as any).id));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.borrowingRequests.findMany({
    where,
    with: {
      student: true,
      component: true,
      decisionBy: true,
    },
    limit: pageSize,
    offset,
    orderBy: [desc(borrowingRequests.createdAt)],
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(borrowingRequests)
    .where(where);
  const total = Number(countResult[0]?.count || 0);

  const mapped = data.map((r: any) => ({
    id: r.id,
    reference: r.reference,
    studentId: r.studentId,
    studentName: r.student?.fullName,
    componentId: r.componentId,
    componentName: r.component?.name,
    componentCode: r.component?.code,
    quantity: r.quantity,
    purpose: r.purpose,
    requestedReturnDate: r.requestedReturnDate,
    status: r.status,
    decisionById: r.decisionById,
    decisionByName: r.decisionBy?.fullName,
    decisionAt: r.decisionAt,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json({
    data: mapped,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.parse(body);

    // Validate component exists and is active
    const component = await db.query.components.findFirst({
      where: eq(components.id, parsed.componentId),
    });
    if (!component || !component.isActive) {
      return NextResponse.json({ error: "Component not found or inactive" }, { status: 404 });
    }

    // Validate return date is in the future
    const returnDate = new Date(parsed.requestedReturnDate);
    if (returnDate <= new Date()) {
      return NextResponse.json({ error: "Return date must be in the future" }, { status: 400 });
    }

    const reference = generateReference("BR");

    const [request] = await db
      .insert(borrowingRequests)
      .values({
        reference,
        studentId: (session.user as any).id,
        componentId: parsed.componentId,
        quantity: parsed.quantity,
        purpose: parsed.purpose || null,
        requestedReturnDate: returnDate,
        status: "PENDING",
      })
      .returning();

    // Notify staff about new request
    const staffUsers = await db.query.profiles.findMany({
      with: { roles: true },
    });
    const staffWithRoles = staffUsers.filter((u: any) =>
      u.roles?.some((r: any) => ["ADMIN", "D2P_INCHARGE", "LAB_STAFF"].includes(r.role))
    );

    for (const staff of staffWithRoles) {
      await createNotification({
        recipientId: staff.id,
        type: "REQUEST_SUBMITTED",
        title: "New Borrowing Request",
        message: `${session.user.name} requested ${parsed.quantity}x ${component.name}`,
        relatedEntityType: "borrowing_request",
        relatedEntityId: request.id,
        dedupeKey: `request_submitted_${request.id}_${staff.id}`,
      });
    }

    await createAuditLog({
      actorId: (session.user as any).id,
      action: "BORROWING_REQUEST_CREATED",
      entityType: "borrowing_request",
      entityId: request.id,
      after: request,
    });

    return NextResponse.json(request, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error("Request create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
