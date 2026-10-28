import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, userRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

const academicYears = ["2023-2027", "2024-2028", "2025-2029", "2026-2030"] as const;
const departments = ["CSE", "AIDS", "IT", "CS-Cyber", "EEE", "ECE", "Aero", "Civil", "Mechanical"] as const;
const sections = ["A", "B", "C", "D"] as const;

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  registerNumber: z.string().min(1, "Register number is required").max(50),
  sprNumber: z.string().min(1, "SPR number is required").max(50),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
  academicYear: z.enum(academicYears),
  department: z.enum(departments),
  section: z.enum(sections),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.parse(body);

    // Check duplicates
    const existingEmail = await db.query.profiles.findFirst({ where: eq(profiles.email, parsed.email) });
    if (existingEmail) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    const existingReg = await db.query.profiles.findFirst({ where: eq(profiles.registerNumber, parsed.registerNumber) });
    if (existingReg) return NextResponse.json({ error: "Register number already registered" }, { status: 409 });
    const existingSpr = await db.query.profiles.findFirst({ where: eq(profiles.sprNumber, parsed.sprNumber) });
    if (existingSpr) return NextResponse.json({ error: "SPR number already registered" }, { status: 409 });

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const fullName = `${parsed.firstName} ${parsed.lastName}`;

    const [user] = await db
      .insert(profiles)
      .values({
        authUserId: crypto.randomUUID() as any,
        email: parsed.email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        fullName,
        registerNumber: parsed.registerNumber,
        sprNumber: parsed.sprNumber,
        rollNumber: parsed.registerNumber,
        mobileNumber: parsed.mobileNumber,
        academicYear: parsed.academicYear,
        department: parsed.department,
        section: parsed.section,
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
      console.error("Signup validation:", JSON.stringify(err.issues ?? err.errors));
      return NextResponse.json({ error: "Validation failed", details: err.issues ?? err.errors }, { status: 400 });
    }
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Duplicate registration" }, { status: 409 });
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}