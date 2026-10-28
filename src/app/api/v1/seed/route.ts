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
      { email: "plicentring9876@gmail.com", password: "Ayyu@123", name: "Ayyappan P", roles: ["ADMIN"] },
      { email: "aashikahamed029@gmail.com", password: "Ayyu@123", name: "Aashik Ahamed A", roles: ["D2P_INCHARGE"] },
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
      const existing = await db.query.categories.findFirst({ where: eq(categories.name, name) });
      if (!existing) {
        await db.insert(categories).values({ name, description: `${name} components` });
      }
    }

    return NextResponse.json({
      message: "Seeded successfully (users + categories only). Run /api/v1/seed/import to import all 80 components.",
      credentials: {
        admin: "plicentring9876@gmail.com / Ayyu@123",
        incharge: "aashikahamed029@gmail.com / Ayyu@123",
      },
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
