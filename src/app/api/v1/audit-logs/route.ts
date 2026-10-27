import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const actorId = searchParams.get("actorId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
  if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.auditLogs.findMany({
    where,
    with: { actor: true },
    limit: pageSize,
    offset,
    orderBy: [desc(auditLogs.createdAt)],
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(where);
  const total = Number(countResult[0]?.count || 0);

  const mapped = data.map((log: any) => ({
    id: log.id,
    actorId: log.actorId,
    actorName: log.actor?.fullName || "System",
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    before: log.before,
    after: log.after,
    correlationId: log.correlationId,
    createdAt: log.createdAt,
  }));

  return NextResponse.json({
    data: mapped,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
