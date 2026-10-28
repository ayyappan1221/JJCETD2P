#!/usr/bin/env node
/**
 * Imports the docx-derived component list into the local database and fills
 * component images from Wikimedia Commons (Openverse fallback).
 *
 * Usage:
 *   node scripts/enrich-components.mjs --report
 *   node scripts/enrich-components.mjs --dry-run --limit=5
 *   node scripts/enrich-components.mjs
 *   node scripts/enrich-components.mjs --refresh
 */
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, "data", "components_data.json");
const rootJsonPath = path.resolve(root, "..", "components_data.json");
const cachePath = path.join(root, "data", "component_images.json");
const dbPath = process.env.DATABASE_URL || path.join(root, "data", "jjcetd2p.db");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const refresh = args.includes("--refresh");
const retryFailed = args.includes("--retry-failed");
const reportOnly = args.includes("--report");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const fetchLimit = limitArg ? Number.parseInt(limitArg.slice(8), 10) : Number.POSITIVE_INFINITY;

const USER_AGENT = "JJCETD2P/1.0 (D2P lab inventory image lookup)";
const REQUEST_TIMEOUT_MS = 8000;
const MIN_REQUEST_GAP_MS = 1200;
const BAD_TITLE_WORDS = [
  "pinout",
  "schematic",
  "diagram",
  "drawing",
  "logo",
  "icon",
  "symbol",
  "map",
  "chart",
  "graph",
  "table",
  "datasheet",
  "banner",
  "poster",
  "cover",
  "sign",
];
const BAD_EXTENSIONS = [".svg", ".gif", ".pdf", ".webm", ".ogv", ".tif", ".tiff"];

// Wikimedia Commons often indexes these under a different common name.
const ALIASES = {
  "ldr sensor": ["photoresistor", "light dependent resistor"],
  "ad8232 ecg module": ["ECG sensor", "electrocardiogram sensor"],
  "sound sensor": ["microphone sensor", "sound detector module"],
  "gy-68 (barometric pressure sensor)": ["BMP180", "barometric pressure sensor"],
  "y3 strain gauge bending sensor": ["strain gauge"],
  "8-channel ir sensor array": ["infrared sensor array", "line follower sensor", "IR sensor array"],
  "sw-520d tilt angle sensor": ["tilt sensor"],
  "dishwasher turbidity sensor": ["nephelometer", "turbidity meter"],
  "acs712 current sensor": ["ACS712"],
  "e18-d80nk ir photoelectric proximity sensor": ["photoelectric sensor"],
  "raspberry pi pico": ["Raspberry Pi Pico"],
  "lilypad arduino": ["LilyPad Arduino"],
  zigbee: ["Zigbee module"],
  "rf wireless transmitter and receiver": ["RF module", "radio frequency module"],
  "ky-040 rotary encoder": ["rotary encoder"],
  "4x4 matrix keypad": ["keypad module", "matrix keypad"],
  "dpdt switch (6-pin)": ["toggle switch"],
  "npn small signal transistor": ["BC547", "transistor"],
  "bo motor": ["BO motor", "dc gear motor"],
  "60 rpm johnson motor": ["Johnson motor", "DC motor"],
  "100 rpm johnson motor": ["Johnson motor", "DC motor"],
  "200 rpm johnson motor": ["Johnson motor", "DC motor"],
  "dc gear motor (10.5 v)": ["DC gear motor"],
  "mg90 servo": ["servo motor"],
  "mg996r servo": ["servo motor"],
  "mg995 servo": ["servo motor"],
  "cytron motor driver": ["motor driver"],
  "l298n motor driver": ["L298N", "motor driver"],
  "mq-3 (alcohol gas sensor)": ["gas sensor module", "MQ-3"],
  "mq-5 gas sensor": ["gas sensor module", "MQ-5"],
  "mq-6 gas sensor": ["gas sensor module", "MQ-6"],
  "mq-7 gas sensor": ["gas sensor module", "MQ-7"],
  "mq-8 gas sensor": ["gas sensor module", "MQ-8"],
  "mq-9 gas sensor": ["gas sensor module", "MQ-9"],
  "mq135 gas sensor": ["gas sensor module", "MQ-135"],
  "ttp223 touch sensor": ["touch sensor", "capacitive touch sensor"],
  "hw139 touch sensor": ["touch sensor"],
  "ky-036 metal touch sensor": ["KY-036", "touch sensor"],
  "raindrop sensor": ["rain sensor"],
  "arduino cables": ["jumper wires"],
  "bulb holder": ["lamp holder"],
  "ubi sensor": ["sensor module", "electronic sensor"],
  "2-pin plug": ["electrical plug"],
  "current and voltage indicator": ["voltage indicator"],
  "water pump": ["water pump"],
  "micro switch": ["microswitch"],
  "push button": ["push button"],
};

let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(name) {
  return normalize(name).split(" ").filter((token) => token.length > 1);
}

function isBadTitle(title) {
  const lower = String(title).toLowerCase();
  if (BAD_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  return BAD_TITLE_WORDS.some((word) => lower.includes(word));
}

function scoreCandidate(name, candidate) {
  const nameTokens = tokens(name);
  const normalizedTitle = normalize(candidate);
  const titleTokens = new Set(tokens(candidate));
  const hits = nameTokens.filter((token) => titleTokens.has(token)).length;
  const substringHits = nameTokens.filter((token) => normalizedTitle.includes(token)).length;
  const modelHit = nameTokens.some((token) => /\d/.test(token) && normalizedTitle.includes(token));
  const fullMatch = normalizedTitle.includes(normalize(name));
  const allTokens = hits === nameTokens.length && nameTokens.length > 0;
  const isPhoto = /\.(jpe?g|png|webp)(\?|$)/i.test(candidate);
  return (
    (fullMatch ? 10 : 0) +
    (allTokens ? 5 : 0) +
    Math.max(hits, substringHits) +
    (isPhoto ? 2 : 0) +
    (modelHit ? 3 : 0)
  );
}

async function fetchJson(url, attempt = 0) {
  const wait = Math.max(0, lastRequestAt + MIN_REQUEST_GAP_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 120000)
      : 5000 * (attempt + 1);
    console.log(`    ... HTTP ${response.status}, retrying in ${Math.round(delay / 1000)}s`);
    await sleep(delay);
    return fetchJson(url, attempt + 1);
  }

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function searchWikimedia(query, name) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "500",
    format: "json",
  });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
  let best = null;
  for (const page of pages) {
    const title = page?.title || "";
    const imageUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
    if (!title || !imageUrl || isBadTitle(title)) continue;
    const score = scoreCandidate(name, `${title} ${imageUrl}`);
    if (score < 4) continue;
    if (!best || score > best.score) best = { score, image: { imageUrl, source: "wikimedia", title } };
  }
  return best?.image ?? null;
}

async function searchOpenverse(query, name) {
  const params = new URLSearchParams({ q: query, page_size: "8", license_type: "all-cc" });
  const data = await fetchJson(`https://api.openverse.org/v1/images/?${params}`);
  const results = Array.isArray(data?.results) ? data.results : [];
  let best = null;
  for (const result of results) {
    const title = result?.title || result?.creator || "";
    const imageUrl = result?.thumbnail || result?.url;
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) continue;
    if (isBadTitle(`${title} ${imageUrl}`)) continue;
    const score = scoreCandidate(name, `${title} ${imageUrl}`);
    if (score < 4) continue;
    if (!best || score > best.score) best = { score, image: { imageUrl, source: "openverse", title } };
  }
  return best?.image ?? null;
}

async function findImage(name) {
  const candidates = [name, ...(ALIASES[name.toLowerCase()] || [])];
  let anyWikimediaResponse = false;

  for (const candidate of candidates) {
    for (const query of [candidate, `${candidate} module`]) {
      try {
        const found = await searchWikimedia(query, candidate);
        anyWikimediaResponse = true;
        if (found) return found;
      } catch {
        // try the next query/candidate
      }
    }
  }

  if (!anyWikimediaResponse) {
    throw new Error("Wikimedia lookup failed (rate limited or network)");
  }

  for (const candidate of candidates) {
    try {
      const found = await searchOpenverse(candidate, candidate);
      if (found) return found;
    } catch {
      return null;
    }
  }
  return null;
}

function slugCode(name, usedCodes) {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 20);
  let code;
  do {
    code = `${slug}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  } while (usedCodes.has(code));
  usedCodes.add(code);
  return code;
}

async function main() {
  if (!fs.existsSync(dataPath)) {
    throw new Error(`List not found: ${dataPath}`);
  }

  const list = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf-8")) : {};
  const db = new PGlite(dbPath);

  const componentCount = await db.query("select count(*)::int as n from components");
  const imageCount = await db.query(
    "select count(*)::int as n from components where image_url is not null and image_url <> '' and image_url not like '%placehold.co%'"
  );
  const categoryCount = await db.query("select count(*)::int as n from categories");
  const listItems = list.reduce((total, category) => total + category.items.length, 0);

  console.log(
    `DB: ${componentCount.rows[0].n} components (${imageCount.rows[0].n} with real images), ${categoryCount.rows[0].n} categories`
  );
  console.log(`List: ${listItems} items in ${list.length} categories`);

  if (reportOnly) {
    await db.close();
    return;
  }

  const existing = await db.query("select id, name, image_url from components");
  const byName = new Map(existing.rows.map((row) => [row.name.toLowerCase(), row]));
  const categoryRows = await db.query("select id, name from categories");
  const catMap = new Map(categoryRows.rows.map((row) => [row.name.toLowerCase(), row.id]));
  const usedCodes = new Set((await db.query("select code from components")).rows.map((row) => row.code));

  let looked = 0;
  let found = 0;
  let reused = 0;

  for (const category of list) {
    for (const item of category.items) {
      const cached = cache[item.name];
      if (!refresh && cached !== undefined) {
        if (cached?.imageUrl) {
          item.imageUrl = cached.imageUrl;
          if (cached.source) reused++;
          continue;
        }
        if (!retryFailed) continue;
      }
      if (looked >= fetchLimit) continue;

      looked++;
      let image = null;
      let failed = false;
      try {
        image = await findImage(item.name);
      } catch (err) {
        failed = true;
        console.warn(`  ! ${item.name}: ${err.message}`);
      }
      if (failed) continue;
      cache[item.name] = image
        ? { ...image, fetchedAt: new Date().toISOString() }
        : { imageUrl: null, fetchedAt: new Date().toISOString() };
      // Persist cache incrementally so progress survives interruption
      try { fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf-8"); } catch {}
      if (image) {
        item.imageUrl = image.imageUrl;
        found++;
        console.log(`  + ${item.name} -> ${image.source}`);
      } else {
        console.log(`  - ${item.name}: no image found`);
      }
    }
  }

  if (!dryRun) {
    fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf-8");
    fs.writeFileSync(dataPath, `${JSON.stringify(list, null, 2)}\n`, "utf-8");
    if (fs.existsSync(rootJsonPath)) {
      fs.writeFileSync(rootJsonPath, `${JSON.stringify(list, null, 2)}\n`, "utf-8");
    }
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  await db.exec("BEGIN");
  try {
    for (const category of list) {
      let categoryId = catMap.get(category.category.toLowerCase());
      if (!categoryId) {
        const result = await db.query(
          "insert into categories (name, description) values ($1, $2) returning id",
          [category.category, `${category.category} components`]
        );
        categoryId = result.rows[0].id;
        catMap.set(category.category.toLowerCase(), categoryId);
      }

      for (const item of category.items) {
        const imageUrl = item.imageUrl || null;
        const row = byName.get(item.name.toLowerCase());

        if (row) {
          const shouldUpdate =
            imageUrl && imageUrl !== row.image_url && (!row.image_url || row.image_url.includes("placehold.co"));
          if (shouldUpdate) {
            await db.query("update components set image_url = $1, updated_at = now() where id = $2", [
              imageUrl,
              row.id,
            ]);
            updated++;
          } else {
            unchanged++;
          }
          continue;
        }

        if (dryRun) {
          inserted++;
          continue;
        }

        const quantity = Number(item.quantity) || 0;
        const minThreshold = quantity > 0 ? Math.max(1, Math.floor(quantity * 0.2)) : 0;
        const code = slugCode(item.name, usedCodes);
        await db.query(
          `insert into components
             (code, name, category_id, unit, total_quantity, available_quantity, issued_quantity, min_stock_threshold, image_url)
           values ($1, $2, $3, 'pcs', $4, $4, 0, $5, $6)`,
          [code, item.name, categoryId, quantity, minThreshold, imageUrl]
        );
        inserted++;
      }
    }
    await db.exec(dryRun ? "ROLLBACK" : "COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  console.log(
    `\nImages: ${found} fetched, ${reused} cached, ${looked} looked up. DB: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged.${dryRun ? " (dry run)" : ""}`
  );
  await db.close();
}

main().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
