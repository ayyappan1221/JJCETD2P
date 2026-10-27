import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, userRoles } from "@/lib/db/schema";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";
import { createAuditLog } from "@/services/audit";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
  roles: z.array(z.enum(["ADMIN", "D2P_INCHARGE", "LAB_STAFF", "STUDENT"])).min(1),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.enum(["ADMIN", "D2P_INCHARGE", "LAB_STAFF", "STUDENT"])).optional(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (search) {
    conditions.push(ilike(profiles.email, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.profiles.findMany({
    where,
    with: { roles: true },
    limit: pageSize,
    offset,
    orderBy: [desc(profiles.createdAt)],
  });

  // Filter by role if specified
  let filtered = data;
  if (role) {
    filtered = data.filter((u: any) => u.roles?.some((r: any) => r.role === role));
  }

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(profiles)
    .where(where);
  const total = Number(countResult[0]?.count || 0);

  const mapped = filtered.map((u: any) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    rollNumber: u.rollNumber,
    department: u.department,
    phone: u.phone,
    isActive: u.isActive,
    roles: u.roles?.map((r: any) => r.role) || [],
    createdAt: u.createdAt,
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
  const { session, error } = await requireRole("ADMIN");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = createUserSchema.parse(body);

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const [user] = await db
      .insert(profiles)
      .values({
        authUserId: crypto.randomUUID() as any,
        email: parsed.email,
        fullName: parsed.fullName,
        rollNumber: parsed.rollNumber || null,
        department: parsed.department || null,
        passwordHash,
        isActive: true,
      })
      .returning();

    // Assign roles
    for (const role of parsed.roles) {
      await db.insert(userRoles).values({
        userId: user.id,
        role: role as any,
      });
    }

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: "USER_CREATED",
      entityType: "user",
      entityId: user.id,
      after: { ...user, roles: parsed.roles },
    });

    return NextResponse.json(
      { ...user, roles: parsed.roles, passwordHash: undefined },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    if (err.code === "23505") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error("User create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
