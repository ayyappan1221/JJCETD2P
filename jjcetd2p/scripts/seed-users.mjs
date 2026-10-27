#!/usr/bin/env node
/** Seeds the demo accounts when the local database is empty. */
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";
import path from "node:path";

const dbPath = process.env.DATABASE_URL || path.join(import.meta.dirname, "..", "data", "jjcetd2p.db");

const users = [
  { email: "admin@jjcet.ac.in", password: "Admin@123", name: "System Administrator", roles: ["ADMIN"] },
  { email: "incharge@jjcet.ac.in", password: "Incharge@123", name: "D2P In-Charge", roles: ["D2P_INCHARGE"] },
  { email: "staff@jjcet.ac.in", password: "Staff@123", name: "Lab Staff", roles: ["LAB_STAFF"] },
  {
    email: "student@jjcet.ac.in",
    password: "Student@123",
    name: "Test Student",
    roles: ["STUDENT"],
    rollNumber: "CSE2024001",
    department: "CSE",
  },
];

const db = new PGlite(dbPath);

const existing = await db.query("select id from profiles where email = $1", [users[0].email]);
if (existing.rows.length > 0) {
  console.log("Users already seeded");
  await db.close();
  process.exit(0);
}

for (const user of users) {
  const passwordHash = await bcrypt.hash(user.password, 12);
  const inserted = await db.query(
    `insert into profiles (auth_user_id, email, full_name, roll_number, department, password_hash, is_active)
     values ($1, $2, $3, $4, $5, $6, true)
     returning id`,
    [crypto.randomUUID(), user.email, user.name, user.rollNumber || null, user.department || null, passwordHash]
  );
  for (const role of user.roles) {
    await db.query("insert into user_roles (user_id, role) values ($1, $2)", [inserted.rows[0].id, role]);
  }
  console.log(`Created ${user.email} (${user.roles.join(", ")})`);
}

await db.close();
console.log("Demo users seeded");
