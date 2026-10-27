import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { generateReference } from "@/lib/utils";

export async function createAuditLog(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: any;
  after?: any;
  correlationId?: string;
}) {
  await db.insert(auditLogs).values({
    actorId: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId || null,
    before: params.before || null,
    after: params.after || null,
    correlationId: params.correlationId || null,
  });
}
