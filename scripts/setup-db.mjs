import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

const dbPath = "./data/jjcetd2p.db";
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const client = new PGlite(dbPath);

const migrationFiles = fs.readdirSync("./drizzle").filter((f) => f.endsWith(".sql")).sort();

async function run() {
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join("./drizzle", file), "utf-8");
    const statements = sql.split("--> statement-breakpoint");
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        try {
          await client.exec(trimmed);
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes("already exists")) {
            console.error(`ERR [${file}]:`, trimmed.substring(0, 60).replace(/\n/g, " "), "-", err.message);
          }
        }
      }
    }
    console.log(`Applied: ${file}`);
  }
  await client.close();
  console.log("All migrations complete");
}

run();
