import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles, userRoles, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.secret !== (process.env.SEED_SECRET || "dev-seed-secret")) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    const existingAdmin = await db.query.profiles.findFirst({
      where: eq(profiles.email, "admin@jjcet.ac.in"),
    });
    if (existingAdmin) {
      return NextResponse.json({ message: "Already seeded" });
    }

    const users = [
      { email: "admin@jjcet.ac.in", password: "Admin@123", name: "System Administrator", roles: ["ADMIN"] },
      { email: "incharge@jjcet.ac.in", password: "Incharge@123", name: "D2P In-Charge", roles: ["D2P_INCHARGE"] },
      { email: "staff@jjcet.ac.in", password: "Staff@123", name: "Lab Staff", roles: ["LAB_STAFF"] },
      { email: "student@jjcet.ac.in", password: "Student@123", name: "Test Student", roles: ["STUDENT"], rollNumber: "CSE2024001", department: "CSE" },
    ];

    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      const [user] = await db.insert(profiles).values({
        authUserId: crypto.randomUUID() as any,
        email: u.email,
        fullName: u.name,
        rollNumber: (u as any).rollNumber || null,
        department: (u as any).department || null,
        passwordHash,
        isActive: true,
      }).returning();
      for (const role of u.roles) {
        await db.insert(userRoles).values({ userId: user.id, role: role as any });
      }
    }

    const categoryNames = [
      "Sensors and Measurement Modules",
      "Microcontrollers and Development Boards",
      "Communication and Wireless Modules",
      "Input and User Interface Components",
      "Displays and Indicators",
      "Switching and Control Components",
      "Motors and Actuators",
      "Motor Drivers",
      "Passive Components and Electrical Accessories",
    ];

    for (const name of categoryNames) {
      await db.insert(categories).values({ name, description: `${name} components` });
    }

    return NextResponse.json({
      message: "Seeded successfully (users + categories only). Run /api/v1/seed/import to import all 80 components.",
      credentials: {
        admin: "admin@jjcet.ac.in / Admin@123",
        incharge: "incharge@jjcet.ac.in / Incharge@123",
        staff: "staff@jjcet.ac.in / Staff@123",
        student: "student@jjcet.ac.in / Student@123",
      },
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
