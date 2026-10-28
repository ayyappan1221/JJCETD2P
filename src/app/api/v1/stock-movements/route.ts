import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockMovements, components } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { generateReference } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const componentId = searchParams.get("componentId");
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (componentId) conditions.push(eq(stockMovements.componentId, componentId));
  if (type) conditions.push(eq(stockMovements.type, type as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.stockMovements.findMany({
    where,
    with: { component: true, performedBy: true },
    limit: pageSize,
    offset,
    orderBy: [desc(stockMovements.createdAt)],
  });

  return NextResponse.json({ data, page, pageSize });
}

// Stock Receipt
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  try {
    const body = await req.json();
    const { type, componentId, quantity, quantityDelta, reason } = body;

    if (!componentId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const component = await db.query.components.findFirst({
      where: eq(components.id, componentId),
    });
    if (!component) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    const result = await db.transaction(async (tx) => {
      let delta = 0;
      let movementType: string;

      if (type === "receipt") {
        if (!quantity || quantity <= 0) {
          throw new Error("INVALID_QUANTITY");
        }
        delta = quantity;
        movementType = "RECEIPT";

        await tx
          .update(components)
          .set({
            totalQuantity: sql`${components.totalQuantity} + ${quantity}`,
            availableQuantity: sql`${components.availableQuantity} + ${quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(components.id, componentId));
      } else if (type === "adjustment") {
        if (!quantityDelta || quantityDelta === 0) {
          throw new Error("INVALID_DELTA");
        }
        delta = quantityDelta;
        movementType = "ADJUSTMENT";

        // Validate resulting quantities won't go negative
        const newAvailable = (component as any).availableQuantity + quantityDelta;
        if (newAvailable < 0) {
          throw new Error("NEGATIVE_STOCK");
        }

        await tx
          .update(components)
          .set({
            totalQuantity: sql`${components.totalQuantity} + ${quantityDelta}`,
            availableQuantity: sql`${components.availableQuantity} + ${quantityDelta}`,
            updatedAt: new Date(),
          })
          .where(eq(components.id, componentId));
      } else {
        throw new Error("INVALID_TYPE");
      }

      const movementRef = generateReference("SM");
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          reference: movementRef,
          componentId,
          type: movementType as any,
          quantityDelta: delta,
          reason,
          performedById: (session!.user as any).id,
        })
        .returning();

      return movement;
    });

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: type === "receipt" ? "STOCK_RECEIVED" : "STOCK_ADJUSTED",
      entityType: "stock_movement",
      entityId: result.id,
      after: result,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    if (err.message === "INVALID_QUANTITY") {
      return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
    }
    if (err.message === "INVALID_DELTA") {
      return NextResponse.json({ error: "Delta cannot be zero" }, { status: 400 });
    }
    if (err.message === "NEGATIVE_STOCK") {
      return NextResponse.json({ error: "Adjustment would result in negative stock" }, { status: 400 });
    }
    if (err.message === "INVALID_TYPE") {
      return NextResponse.json({ error: "Invalid movement type" }, { status: 400 });
    }
    console.error("Stock movement error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
