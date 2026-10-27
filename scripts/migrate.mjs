import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";
if (url.startsWith("postgres")) {
  console.log("Running database migrations...");
  const r = spawnSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
} else {
  console.log("Skipping migrations (non-postgres DATABASE_URL).");
}
