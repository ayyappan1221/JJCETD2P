import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, ilike, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { createAuditLog } from "@/services/audit";
import { z } from "zod";

const categoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const where = search ? ilike(categories.name, `%${search}%`) : undefined;

  const [data, countResult] = await Promise.all([
    db.query.categories.findMany({
      where,
      limit: pageSize,
      offset,
      orderBy: (c, { asc }) => [asc(c.name)],
    }),
    db.select({ count: sql<number>`count(*)` }).from(categories).where(where),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return NextResponse.json({
    data,
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
    const parsed = categoryCreateSchema.parse(body);

    const [category] = await db
      .insert(categories)
      .values({
        name: parsed.name,
        description: parsed.description || null,
      })
      .returning();

    await createAuditLog({
      actorId: (session!.user as any).id,
      action: "CATEGORY_CREATED",
      entityType: "category",
      entityId: category.id,
      after: category,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    if (err.code === "23505") {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
