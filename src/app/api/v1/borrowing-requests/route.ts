import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { borrowingRequests, borrowingRequestItems, components, profiles } from "@/lib/db/schema";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { requireRole, requireAuth } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { createNotification } from "@/services/notifications";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { z } from "zod";
import { generateReference } from "@/lib/utils";

const createSchema = z.object({
  componentId: z.string().uuid().optional(),
  quantity: z.number().int().positive().optional(),
  items: z.array(z.object({
    componentId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).optional(),
  purpose: z.string().optional(),
  requestedReturnDate: z.string().datetime(),
  cartId: z.string().uuid().optional(),
}).refine((d) => d.items?.length || (d.componentId && d.quantity), {
  message: "Provide either items array or componentId+quantity",
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
    ["ADMIN", "D2P_INCHARGE"].includes(r)
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
      items: { with: { component: true } },
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

  const mapped = data.map((r: any) => {
    const items = (r.items && r.items.length > 0)
      ? r.items.map((it: any) => ({
          id: it.id,
          componentId: it.componentId,
          componentName: it.component?.name,
          componentCode: it.component?.code,
          quantity: it.quantity,
        }))
      : (r.componentId ? [{ id: null, componentId: r.componentId, componentName: r.component?.name, componentCode: r.component?.code, quantity: r.quantity }] : []);
    return {
      id: r.id,
      reference: r.reference,
      cartId: r.cartId,
      studentId: r.studentId,
      studentName: r.student?.fullName,
      componentId: r.componentId,
      componentName: items.length === 1 ? items[0].componentName : `${items.length} items`,
      componentCode: items.length === 1 ? items[0].componentCode : null,
      quantity: items.length === 1 ? items[0].quantity : items.reduce((s: number, it: any) => s + it.quantity, 0),
      items,
      purpose: r.purpose,
      requestedReturnDate: r.requestedReturnDate,
      status: r.status,
      decisionById: r.decisionById,
      decisionByName: r.decisionBy?.fullName,
      decisionAt: r.decisionAt,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.parse(body);

    const items = parsed.items && parsed.items.length > 0
      ? parsed.items
      : [{ componentId: parsed.componentId!, quantity: parsed.quantity! }];

    // Validate all components exist and are active
    const componentsList: any[] = [];
    for (const it of items) {
      const component = await db.query.components.findFirst({
        where: eq(components.id, it.componentId),
      });
      if (!component || !component.isActive) {
        return NextResponse.json({ error: `Component not found or inactive: ${it.componentId}` }, { status: 404 });
      }
      componentsList.push({ ...it, component });
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
        cartId: parsed.cartId || null,
        studentId: (session.user as any).id,
        componentId: items.length === 1 ? items[0].componentId : null,
        quantity: items.length === 1 ? items[0].quantity : null,
        purpose: parsed.purpose || null,
        requestedReturnDate: returnDate,
        status: "PENDING",
      })
      .returning();

    // Insert line items
    await db.insert(borrowingRequestItems).values(
      items.map((it) => ({
        requestId: request.id,
        componentId: it.componentId,
        quantity: it.quantity,
      }))
    );

    // Notify staff about new request
    const staffUsers = await db.query.profiles.findMany({
      with: { roles: true },
    });
    const staffWithRoles = staffUsers.filter((u: any) =>
      u.roles?.some((r: any) => ["ADMIN", "D2P_INCHARGE"].includes(r.role))
    );

    const itemsSummary = componentsList.map((c) => `${c.quantity}x ${c.component.name}`).join(", ");

    for (const staff of staffWithRoles) {
      await createNotification({
        recipientId: staff.id,
        type: "REQUEST_SUBMITTED",
        title: "New Borrowing Request",
        message: `${session.user.name} requested: ${itemsSummary}`,
        relatedEntityType: "borrowing_request",
        relatedEntityId: request.id,
        dedupeKey: `request_submitted_${request.id}_${staff.id}`,
      });

      // Email notification to staff/incharge (if configured)
      if (isEmailConfigured() && staff.email) {
        const itemsHtml = componentsList.map((c) => `<li>${c.quantity}x ${c.component.name} (${c.component.code})</li>`).join("");
        await sendEmail(
          staff.email,
          "New Component Request — JJCETD2P",
          `<p>Dear ${staff.fullName},</p>
           <p><strong>${session.user.name}</strong> has submitted a borrowing request with the following items:</p>
           <ul>${itemsHtml}</ul>
           <p>Purpose: ${parsed.purpose || "N/A"}</p>
           <p>Expected return: ${new Date(parsed.requestedReturnDate).toLocaleDateString()}</p>
           <p>Please review and approve/reject in the D2P Lab system.</p>
           <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/approvals" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Review Request</a></p>`
        );
      }
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
