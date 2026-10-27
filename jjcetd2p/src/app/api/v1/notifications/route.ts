import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  const userId = (session.user as any).id;
  const conditions = [eq(notifications.recipientId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));

  const where = and(...conditions);

  const data = await db.query.notifications.findMany({
    where,
    limit: pageSize,
    offset,
    orderBy: [desc(notifications.createdAt)],
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(where);
  const total = Number(countResult[0]?.count || 0);

  const unreadResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)));
  const unreadCount = Number(unreadResult[0]?.count || 0);

  return NextResponse.json({
    data,
    total,
    unreadCount,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userId = (session.user as any).id;

  if (body.action === "markAllRead") {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipientId, userId));
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, body.id), eq(notifications.recipientId, userId)));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
