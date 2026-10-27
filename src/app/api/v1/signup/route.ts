import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, userRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  rollNumber: z.string().optional(),
  department: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.parse(body);

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

    await db.insert(userRoles).values({ userId: user.id, role: "STUDENT" });

    return NextResponse.json(
      { id: user.id, email: user.email, fullName: user.fullName, roles: ["STUDENT"] },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: err.errors }, { status: 400 });
    }
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
