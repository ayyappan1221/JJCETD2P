import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "./data/jjcetd2p.db";

function createDb() {
  if (dbUrl.startsWith("postgres")) {
    const sql = neon(dbUrl);
    return drizzleNeon(sql, { schema });
  }
  const dataDir = path.dirname(dbUrl);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const client = new PGlite(dbUrl);
  return drizzlePglite(client, { schema });
}

export const db: any = createDb();
export type DB = any;
