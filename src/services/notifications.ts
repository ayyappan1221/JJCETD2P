import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function createNotification(params: {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  dedupeKey?: string;
}) {
  // Check for duplicate
  if (params.dedupeKey) {
    const existing = await db.query.notifications.findFirst({
      where: (n, { eq: e }) => e(n.dedupeKey, params.dedupeKey!),
    });
    if (existing) return existing;
  }

  const [notification] = await db
    .insert(notifications)
    .values({
      recipientId: params.recipientId,
      type: params.type as any,
      title: params.title,
      message: params.message,
      relatedEntityType: params.relatedEntityType || null,
      relatedEntityId: params.relatedEntityId || null,
      dedupeKey: params.dedupeKey || null,
    })
    .returning();

  return notification;
}

export async function markAsRead(notificationId: string, userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.recipientId, userId));
}
