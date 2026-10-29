import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { createAuditLog } from "@/services/audit";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (v2)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  const { id } = await params;

  const component = await db.query.components.findFirst({ where: eq(components.id, id) });
  if (!component) return NextResponse.json({ error: "Component not found" }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image file provided" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: "Only JPG, JPEG, PNG, WebP images are allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const [updated] = await db
      .update(components)
      .set({ imageUrl: dataUrl, updatedAt: new Date() })
      .where(eq(components.id, id))
      .returning();

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: "COMPONENT_IMAGE_UPDATED",
      entityType: "component",
      entityId: id,
      before: { imageUrl: component.imageUrl },
      after: { imageUrl: dataUrl.substring(0, 50) + "..." },
    });

    return NextResponse.json({ id: updated.id, imageUrl: updated.imageUrl });
  } catch (err: any) {
    console.error("Image upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  const { id } = await params;
  await db.update(components).set({ imageUrl: null, updatedAt: new Date() }).where(eq(components.id, id));
  return NextResponse.json({ success: true });
}