import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, userRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.enum(["ADMIN", "D2P_INCHARGE", "LAB_STAFF", "STUDENT"])).optional(),
  password: z.string().min(8).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { id } = await params;
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, id),
    with: { roles: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    roles: (user as any).roles?.map((r: any) => r.role) || [],
    passwordHash: undefined,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateUserSchema.parse(body);

    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.id, id),
      with: { roles: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date() };
    if (parsed.fullName) updateData.fullName = parsed.fullName;
    if (parsed.rollNumber !== undefined) updateData.rollNumber = parsed.rollNumber;
    if (parsed.department !== undefined) updateData.department = parsed.department;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;
    if (parsed.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.password, 12);
    }

    const [updated] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, id))
      .returning();

    // Update roles if provided
    if (parsed.roles) {
      await db.delete(userRoles).where(eq(userRoles.userId, id));
      for (const role of parsed.roles) {
        await db.insert(userRoles).values({ userId: id, role: role as any });
      }
    }

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: "USER_UPDATED",
      entityType: "user",
      entityId: id,
      before: existing,
      after: { ...updated, roles: parsed.roles || (existing as any).roles?.map((r: any) => r.role) },
    });

    return NextResponse.json({ ...updated, passwordHash: undefined });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    console.error("User update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
