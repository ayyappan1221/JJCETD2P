import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, components } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { createAuditLog } from "@/services/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(categories)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: "CATEGORY_UPDATED",
      entityType: "category",
      entityId: id,
      before: existing,
      after: updated,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { id } = await params;

  // Check if category is in use
  const inUse = await db
    .select({ count: sql<number>`count(*)` })
    .from(components)
    .where(eq(components.categoryId, id));

  if (Number(inUse[0]?.count || 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete category in use by components. Archive it instead." },
      { status: 409 }
    );
  }

  const existing = await db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  await db.delete(categories).where(eq(categories.id, id));

  await createAuditLog({
    actorId: (session!.user as any).id,
    action: "CATEGORY_DELETED",
    entityType: "category",
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
