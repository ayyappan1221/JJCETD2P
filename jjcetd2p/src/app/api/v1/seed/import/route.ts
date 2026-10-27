import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

// POST /api/v1/seed/import - imports all 80 components from components_data.json
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.secret !== (process.env.SEED_SECRET || "dev-seed-secret")) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    // Read components data
    const dataPath = path.join(process.cwd(), "data", "components_data.json");
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: "components_data.json not found" }, { status: 404 });
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    // Map category names to DB categories
    const dbCategories = await db.query.categories.findMany();
    const catMap = new Map(dbCategories.map((c: { name: string; id: string }) => [c.name.toLowerCase(), c.id]));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const cat of rawData) {
      const catName = cat.category;
      // Find or create category
      let categoryId = catMap.get(catName.toLowerCase());
      if (!categoryId) {
        const [newCat] = await db
          .insert(categories)
          .values({ name: catName, description: `${catName} components` })
          .returning();
        categoryId = newCat.id;
        catMap.set(catName.toLowerCase(), categoryId);
      }

      for (const item of cat.items) {
        // Generate a component code from the name
        const code = item.name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 20) + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

        // Check if already exists
        const existing = await db.query.components.findFirst({
          where: eq(components.name, item.name),
        });
        if (existing) {
          const needsImage =
            item.imageUrl &&
            item.imageUrl !== existing.imageUrl &&
            (!existing.imageUrl || existing.imageUrl.includes("placehold.co"));
          if (needsImage) {
            await db
              .update(components)
              .set({ imageUrl: item.imageUrl, updatedAt: new Date() })
              .where(eq(components.id, existing.id));
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        const qty = item.quantity || 0;
        const imageUrl =
          item.imageUrl ||
          `https://placehold.co/300x200/1e40af/white?text=${encodeURIComponent(item.name.substring(0, 20))}`;
        const minThreshold = qty > 0 ? Math.max(1, Math.floor(qty * 0.2)) : 0;

        await db.insert(components).values({
          code,
          name: item.name,
          categoryId,
          unit: "pcs",
          totalQuantity: qty,
          availableQuantity: qty,
          issuedQuantity: 0,
          minStockThreshold: minThreshold,
          imageUrl,
        });
        created++;
      }
    }

    return NextResponse.json({
      message: `Imported ${created} components, updated ${updated} images, skipped ${skipped} duplicates`,
      total: created + updated + skipped,
    });
  } catch (err: unknown) {
    console.error("Import error:", err);
    return NextResponse.json({ error: (err as { message?: string })?.message ?? "Unknown error" }, { status: 500 });
  }
}
