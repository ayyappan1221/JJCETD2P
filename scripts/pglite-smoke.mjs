import { PGlite } from "@electric-sql/pglite";

const mode = process.argv[2] || "memory";
const target = mode === "file" ? "./data/jjcetd2p.db" : "memory://";

try {
  const db = new PGlite(target);
  await db.waitReady;
  const result = await db.query("select 1 as ok");
  console.log(target, "OK", result.rows);
  await db.close();
} catch (err) {
  console.error(target, "FAILED", err.message);
  process.exitCode = 1;
}
