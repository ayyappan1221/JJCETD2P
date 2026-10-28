import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueRecords, notifications } from "@/lib/db/schema";
import { eq, and, lt, or, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { createNotification } from "@/services/notifications";

export async function POST(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  if (!isEmailConfigured()) {
    return NextResponse.json({ message: "Email not configured", sent: 0 });
  }

  const now = new Date();
  const data = await db.query.issueRecords.findMany({
    where: and(
      or(eq(issueRecords.status, "ACTIVE"), eq(issueRecords.status, "PARTIALLY_RETURNED")),
      lt(issueRecords.expectedReturnDate, now)
    ),
    with: { student: true, component: true },
  });

  let sent = 0;
  for (const r of data as any[]) {
    const email = r.student?.email;
    if (!email) continue;
    const dedupeKey = `overdue-email-${r.id}-${now.toISOString().slice(0, 10)}`;
    // check dedupe
    const existing = await db.query.notifications.findFirst({ where: (n: any, { eq: e }: any) => e(n.dedupeKey, dedupeKey) });
    if (existing) continue;

    const ok = await sendEmail(
      email,
      "Overdue Component Return — JJCETD2P",
      `<p>Dear ${r.student?.fullName},</p>
       <p>Your borrowed component <strong>${r.component?.name}</strong> (${r.component?.code}) is overdue.</p>
       <p>Expected return date: ${new Date(r.expectedReturnDate).toLocaleDateString()}</p>
       <p>Please return it to the D2P Lab at the earliest.</p>`
    );
    if (ok) {
      sent++;
      await createNotification({
        recipientId: r.studentId,
        type: "COMPONENT_OVERDUE",
        title: "Overdue component",
        message: `${r.component?.name} is overdue. Please return it.`,
        relatedEntityType: "issue",
        relatedEntityId: r.id,
        dedupeKey,
      });
    }
  }

  return NextResponse.json({ message: `Sent ${sent} overdue emails`, sent, total: data.length });
}