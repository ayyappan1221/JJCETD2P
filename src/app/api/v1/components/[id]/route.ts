import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { createAuditLog } from "@/services/audit";
import { findComponentImage } from "@/lib/image-search";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
  unit: z.string().min(1).max(30).optional(),
  storageLocation: z.string().optional(),
  minStockThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().max(500).optional().nullable(),
  autoImage: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const component = await db.query.components.findFirst({
    where: eq(components.id, id),
    with: { category: true },
  });
  if (!component) {
    return NextResponse.json({ error: "Component not found" }, { status: 404 });
  }
  return NextResponse.json({
    ...component,
    categoryName: (component as { category?: { name?: string } }).category?.name || null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole("ADMIN", "LAB_STAFF");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const existing = await db.query.components.findFirst({
      where: eq(components.id, id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    const { autoImage, imageUrl, ...changes } = parsed;
    const nextName = parsed.name || existing.name;
    const updateData: Record<string, unknown> = { ...changes, updatedAt: new Date() };

    if (imageUrl !== undefined && imageUrl !== null && imageUrl.trim() !== "") {
      updateData.imageUrl = imageUrl.trim();
    } else if (autoImage !== false) {
      const found = await findComponentImage(nextName);
      if (found) updateData.imageUrl = found.imageUrl;
    }

    const [updated] = await db
      .update(components)
      .set(updateData)
      .where(eq(components.id, id))
      .returning();

    await createAuditLog({
      actorId: (session!.user as { id: string }).id,
      action: "COMPONENT_UPDATED",
      entityType: "component",
      entityId: id,
      before: existing,
      after: updated,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: (err as { issues?: unknown }).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
