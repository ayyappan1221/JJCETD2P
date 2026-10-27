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

const ALIASES: Record<string, string[]> = {
  "ldr sensor": ["photoresistor", "light dependent resistor"],
  "ad8232 ecg module": ["ECG sensor", "electrocardiogram sensor"],
  "sound sensor": ["microphone sensor", "sound detector module"],
  "gy-68 (barometric pressure sensor)": ["BMP180", "barometric pressure sensor"],
  "y3 strain gauge bending sensor": ["strain gauge"],
  "ky-036 metal touch sensor": ["KY-036", "touch sensor"],
  "8-channel ir sensor array": ["infrared sensor array", "line follower sensor", "IR sensor array"],
  "raindrop sensor": ["rain sensor"],
  "sw-520d tilt angle sensor": ["tilt sensor"],
  "dishwasher turbidity sensor": ["nephelometer", "turbidity meter"],
  "mq-3 (alcohol gas sensor)": ["gas sensor module", "MQ-3"],
  "mq-5 gas sensor": ["gas sensor module", "MQ-5"],
  "mq-6 gas sensor": ["gas sensor module", "MQ-6"],
  "mq-7 gas sensor": ["gas sensor module", "MQ-7"],
  "mq-8 gas sensor": ["gas sensor module", "MQ-8"],
  "mq-9 gas sensor": ["gas sensor module", "MQ-9"],
  "mq135 gas sensor": ["gas sensor module", "MQ-135"],
  "acs712 current sensor": ["ACS712"],
  "e18-d80nk ir photoelectric proximity sensor": ["photoelectric sensor"],
  "raspberry pi pico": ["Raspberry Pi Pico"],
  "lilypad arduino": ["LilyPad Arduino"],
  zigbee: ["Zigbee module"],
  "rf wireless transmitter and receiver": ["RF module", "radio frequency module"],
  "ky-040 rotary encoder": ["rotary encoder"],
  "4x4 matrix keypad": ["keypad module", "matrix keypad"],
  "4×4 matrix keypad": ["keypad module", "matrix keypad"],
  "ttp223 touch sensor": ["touch sensor", "capacitive touch sensor"],
  "hw139 touch sensor": ["touch sensor"],
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
  l298n: ["L298N", "motor driver"],
  "l298n motor driver": ["L298N", "motor driver"],
  "ubi sensor": ["sensor module", "electronic sensor"],
  "arduino cables": ["jumper wires"],
  "bulb holder": ["lamp holder"],
  "2-pin plug": ["electrical plug"],
  "current and voltage indicator": ["voltage indicator"],
  "water pump": ["water pump"],
  "micro switch": ["microswitch"],
  "push button": ["push button"],
};

export interface ComponentImage {
  imageUrl: string;
  source: "wikimedia" | "openverse";
  title: string;
}

const memoryCache = new Map<string, ComponentImage | null>();
let lastRequestAt = 0;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(name: string): string[] {
  return normalize(name)
    .split(" ")
    .filter((token) => token.length > 1);
}

function isBadTitle(title: string): boolean {
  const lower = title.toLowerCase();
  if (BAD_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  return BAD_TITLE_WORDS.some((word) => lower.includes(word));
}

function scoreCandidate(name: string, candidate: string): number {
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, attempt = 0): Promise<unknown> {
  const wait = Math.max(0, lastRequestAt + MIN_REQUEST_GAP_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 3) {
    const retryAfter = response.headers.get("retry-after");
    let delay = 1000 * 2 ** attempt;
    if (retryAfter && /^\d+$/.test(retryAfter)) delay = Math.max(delay, Number(retryAfter) * 1000);
    await sleep(delay);
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function searchWikimedia(query: string, name: string): Promise<ComponentImage | null> {
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
  const data = (await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`)) as { query?: { pages?: Record<string, unknown> } };
  const pages: unknown[] = data?.query?.pages ? Object.values(data.query.pages) : [];

  let best: { score: number; image: ComponentImage } | null = null;
  for (const raw of pages) {
    const page = raw as { title?: string; imageinfo?: { thumburl?: string; url?: string }[] };
    const title: string = page?.title || "";
    if (!title || isBadTitle(title)) continue;
    const imageUrl: string | undefined = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
    if (!imageUrl) continue;
    const score = scoreCandidate(name, `${title} ${imageUrl}`);
    if (score < 4) continue;
    if (!best || score > best.score) {
      best = { score, image: { imageUrl, source: "wikimedia", title } };
    }
  }
  return best?.image ?? null;
}

async function searchOpenverse(query: string, name: string): Promise<ComponentImage | null> {
  const params = new URLSearchParams({ q: query, page_size: "8", license_type: "all-cc" });
  const data = (await fetchJson(`https://api.openverse.org/v1/images/?${params}`)) as { results?: unknown[] };
  const results: unknown[] = Array.isArray(data?.results) ? data.results : [];

  let best: { score: number; image: ComponentImage } | null = null;
  for (const raw of results) {
    const result = raw as { title?: string; creator?: string; thumbnail?: string; url?: string };
    const title: string = result?.title || result?.creator || "";
    const imageUrl: string | undefined = result?.thumbnail || result?.url;
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) continue;
    if (isBadTitle(`${title} ${imageUrl}`)) continue;
    const score = scoreCandidate(name, `${title} ${imageUrl}`);
    if (score < 4) continue;
    if (!best || score > best.score) {
      best = { score, image: { imageUrl, source: "openverse", title } };
    }
  }
  return best?.image ?? null;
}

export async function findComponentImage(name: string): Promise<ComponentImage | null> {
  const key = normalize(name);
  if (!key) return null;
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const candidates = [name, ...(ALIASES[key] || [])];
  let anyWikimediaResponse = false;
  let found: ComponentImage | null = null;

  for (const candidate of candidates) {
    for (const query of [candidate, `${candidate} module`]) {
      try {
        const hit = await searchWikimedia(query, name);
        anyWikimediaResponse = true;
        if (hit) {
          found = hit;
          break;
        }
      } catch {
        // try next query/candidate
      }
    }
    if (found) break;
  }

  if (!found && anyWikimediaResponse) {
    for (const candidate of candidates) {
      try {
        const hit = await searchOpenverse(candidate, name);
        if (hit) {
          found = hit;
          break;
        }
      } catch {
        // Openverse unavailable; keep found as null
      }
    }
  }

  memoryCache.set(key, found);
  return found;
}
