import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components } from "@/lib/db/schema";
import { eq, ilike, sql, and, or } from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm/sql/sql";
import { requireRole } from "@/lib/auth/rbac";
import { createAuditLog } from "@/services/audit";
import { findComponentImage } from "@/lib/image-search";
import { z } from "zod";
import { generateReference } from "@/lib/utils";

const componentCreateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
  unit: z.string().min(1).max(30).default("pcs"),
  totalQuantity: z.number().int().min(0).default(0),
  storageLocation: z.string().optional(),
  minStockThreshold: z.number().int().min(0).default(0),
  imageUrl: z.string().max(500).optional().nullable(),
  autoImage: z.boolean().optional().default(true),
});

function placeholderImage(name: string) {
  return `https://placehold.co/300x200/1e40af/white?text=${encodeURIComponent(name.substring(0, 20))}`;
}

async function resolveImageUrl(name: string, requested?: string | null, autoImage = true) {
  const explicit = requested?.trim();
  if (explicit) return explicit;
  if (autoImage) {
    const found = await findComponentImage(name);
    if (found) return found.imageUrl;
  }
  return placeholderImage(name);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId");
  const isActive = searchParams.get("isActive");
  const lowStock = searchParams.get("lowStock") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const conditions: (SQLWrapper | undefined)[] = [];
  if (search) {
    conditions.push(
      or(
        ilike(components.name, `%${search}%`),
        ilike(components.code, `%${search}%`)
      )
    );
  }
  if (categoryId) {
    conditions.push(eq(components.categoryId, categoryId));
  }
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    conditions.push(eq(components.isActive, isActive === "true"));
  }
  if (lowStock) {
    conditions.push(sql`${components.availableQuantity} <= ${components.minStockThreshold} AND ${components.totalQuantity} > 0 AND ${components.minStockThreshold} > 0`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.components.findMany({
      where,
      with: { category: true },
      limit: pageSize,
      offset,
      orderBy: (c, { asc }) => [asc(c.name)],
    }),
    db.select({ count: sql<number>`count(*)` }).from(components).where(where),
  ]);

  const total = Number(countResult[0]?.count || 0);

  const mapped = data.map((c: { category?: { name?: string } }) => ({
    ...c,
    categoryName: c.category?.name || null,
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
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = componentCreateSchema.parse(body);
    const imageUrl = await resolveImageUrl(parsed.name, parsed.imageUrl, parsed.autoImage);

    const [component] = await db
      .insert(components)
      .values({
        code: parsed.code,
        name: parsed.name,
        categoryId: parsed.categoryId || null,
        description: parsed.description || null,
        unit: parsed.unit,
        totalQuantity: parsed.totalQuantity,
        availableQuantity: parsed.totalQuantity,
        issuedQuantity: 0,
        storageLocation: parsed.storageLocation || null,
        minStockThreshold: parsed.minStockThreshold,
        imageUrl,
      })
      .returning();

    // Create initial stock movement if quantity > 0
    if (parsed.totalQuantity > 0) {
      const { stockMovements } = await import("@/lib/db/schema");
      await db.insert(stockMovements).values({
        reference: generateReference("SM"),
        componentId: component.id,
        type: "RECEIPT",
        quantityDelta: parsed.totalQuantity,
        reason: "Initial stock on component creation",
        performedById: (session!.user as { id: string }).id,
      });
    }

    await createAuditLog({
      actorId: (session!.user as { id: string }).id,
      action: "COMPONENT_CREATED",
      entityType: "component",
      entityId: component.id,
      after: component,
    });

    return NextResponse.json(component, { status: 201 });
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: (err as { issues?: unknown }).issues }, { status: 400 });
    }
    if ((err as { code?: string })?.code === "23505") {
      return NextResponse.json({ error: "Component code already exists" }, { status: 409 });
    }
    console.error("Component create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
