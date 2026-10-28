import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  components,
  categories,
  borrowingRequests,
  issueRecords,
  returnRecords,
  stockMovements,
  profiles,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, count, or, lt } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import { auth } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "inventory-summary";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const componentId = searchParams.get("componentId");
  const categoryId = searchParams.get("categoryId");
  const studentId = searchParams.get("studentId");
  const status = searchParams.get("status");
  const format = searchParams.get("format");

  const dateFilter = (col: any) => {
    const conditions: any[] = [];
    if (startDate) conditions.push(gte(col, new Date(startDate)));
    if (endDate) conditions.push(lte(col, new Date(endDate)));
    return conditions;
  };

  let data: any = {};

  switch (type) {
    case "inventory-summary": {
      const items = await db.query.components.findMany({
        with: { category: true },
        orderBy: (c, { asc }) => [asc(c.name)],
      });
      data = {
        items: items.map((c: any) => ({
          code: c.code,
          name: c.name,
          category: c.category?.name || "Uncategorized",
          unit: c.unit,
          total: c.totalQuantity,
          available: c.availableQuantity,
          issued: c.issuedQuantity,
          minThreshold: c.minStockThreshold,
          isLowStock: c.availableQuantity <= c.minStockThreshold,
          location: c.storageLocation,
          isActive: c.isActive,
        })),
        summary: {
          totalComponents: items.length,
          totalUnits: items.reduce((s: number, c: any) => s + c.totalQuantity, 0),
          totalAvailable: items.reduce((s: number, c: any) => s + c.availableQuantity, 0),
          totalIssued: items.reduce((s: number, c: any) => s + c.issuedQuantity, 0),
          lowStockCount: items.filter((c: any) => c.availableQuantity <= c.minStockThreshold).length,
        },
      };
      break;
    }
    case "issued-components": {
      const items = await db.query.issueRecords.findMany({
        with: { student: true, component: true, issuedBy: true, returns: true },
        orderBy: (t, { desc }) => [desc(t.issuedAt)],
      });
      data = {
        items: items.map((r: any) => ({
          reference: r.reference,
          student: r.student?.fullName,
          component: r.component?.name,
          code: r.component?.code,
          quantityIssued: r.quantityIssued,
          totalReturned: (r.returns || []).reduce((s: number, ret: any) => s + ret.quantity, 0),
          outstanding: r.quantityIssued - (r.returns || []).reduce((s: number, ret: any) => s + ret.quantity, 0),
          issuedBy: r.issuedBy?.fullName,
          issuedAt: r.issuedAt,
          expectedReturn: r.expectedReturnDate,
          status: r.status,
        })),
      };
      break;
    }
    case "borrowing-requests": {
      const items = await db.query.borrowingRequests.findMany({
        with: { student: true, component: true, decisionBy: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
      data = {
        items: items.map((r: any) => ({
          reference: r.reference,
          student: r.student?.fullName,
          component: r.component?.name,
          code: r.component?.code,
          quantity: r.quantity,
          status: r.status,
          decisionBy: r.decisionBy?.fullName,
          decisionAt: r.decisionAt,
          rejectionReason: r.rejectionReason,
          createdAt: r.createdAt,
        })),
      };
      break;
    }
    case "overdue": {
      const now = new Date();
      const items = await db.query.issueRecords.findMany({
        where: and(
          or(eq(issueRecords.status, "ACTIVE"), eq(issueRecords.status, "PARTIALLY_RETURNED")),
          lt(issueRecords.expectedReturnDate, now)
        ),
        with: { student: true, component: true, returns: true },
        orderBy: (t, { desc }) => [desc(t.expectedReturnDate)],
      });
      data = {
        items: items.map((r: any) => {
          const totalReturned = (r.returns || []).reduce((s: number, ret: any) => s + ret.quantity, 0);
          return {
            reference: r.reference,
            student: r.student?.fullName,
            component: r.component?.name,
            code: r.component?.code,
            quantityIssued: r.quantityIssued,
            outstanding: r.quantityIssued - totalReturned,
            expectedReturn: r.expectedReturnDate,
            overdueDays: Math.floor((now.getTime() - new Date(r.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24)),
          };
        }),
      };
      break;
    }
    case "stock-movements": {
      const items = await db.query.stockMovements.findMany({
        with: { component: true, performedBy: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
      data = {
        items: items.map((m: any) => ({
          reference: m.reference,
          component: m.component?.name,
          code: m.component?.code,
          type: m.type,
          quantityDelta: m.quantityDelta,
          reason: m.reason,
          performedBy: m.performedBy?.fullName,
          createdAt: m.createdAt,
        })),
      };
      break;
    }
    case "low-stock": {
      const items = await db.query.components.findMany({
        where: and(eq(components.isActive, true), sql`${components.availableQuantity} <= ${components.minStockThreshold}`, sql`${components.totalQuantity} > 0`, sql`${components.minStockThreshold} > 0`),
        with: { category: true },
        orderBy: (c, { asc }) => [asc(c.name)],
      });
      data = {
        items: items.map((c: any) => ({
          code: c.code,
          name: c.name,
          category: c.category?.name || "Uncategorized",
          available: c.availableQuantity,
          minThreshold: c.minStockThreshold,
          deficit: c.minStockThreshold - c.availableQuantity,
        })),
      };
      break;
    }
    case "frequently-borrowed": {
      const items = await db
        .select({
          componentId: borrowingRequests.componentId,
          count: sql<number>`count(*)`,
          totalQty: sql<number>`sum(${borrowingRequests.quantity})`,
        })
        .from(borrowingRequests)
        .groupBy(borrowingRequests.componentId)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      const enriched = await Promise.all(
        items.map(async (item: any) => {
          const comp = await db.query.components.findFirst({
            where: eq(components.id, item.componentId),
          });
          return {
            component: comp?.name,
            code: comp?.code,
            requestCount: Number(item.count),
            totalQuantity: Number(item.totalQty),
          };
        })
      );
      data = { items: enriched };
      break;
    }
    case "student-borrowing": {
      if (!studentId) {
        return NextResponse.json({ error: "studentId required" }, { status: 400 });
      }
      const requests = await db.query.borrowingRequests.findMany({
        where: eq(borrowingRequests.studentId, studentId),
        with: { component: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      });
      const issues = await db.query.issueRecords.findMany({
        where: eq(issueRecords.studentId, studentId),
        with: { component: true, returns: true },
        orderBy: (t, { desc }) => [desc(t.issuedAt)],
      });
      data = { requests, issues };
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }

  // CSV export
  if (format === "csv" && data.items) {
    const headers = Object.keys(data.items[0] || {});
    const csv = [
      headers.join(","),
      ...data.items.map((row: any) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
