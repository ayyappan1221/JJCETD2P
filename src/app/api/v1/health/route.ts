import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ status: "unhealthy", error: "Database not configured (DATABASE_URL missing)" }, { status: 503 });
    }
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "healthy", timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: "unhealthy", error: "Database connection failed" }, { status: 503 });
  }
}
