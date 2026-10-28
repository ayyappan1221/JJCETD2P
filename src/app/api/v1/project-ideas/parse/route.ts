import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { components } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/rbac";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function POST(req: NextRequest) {
  const { error } = await requireRole("STUDENT", "ADMIN", "D2P_INCHARGE");
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    let text = "";

    if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (name.endsWith(".pdf")) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text || "";
      await parser.destroy();
    } else if (name.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .docx, .pdf, or .txt" }, { status: 400 });
    }

    const lowerText = text.toLowerCase();

    // Load inventory
    const inventory = await db.query.components.findMany({ with: { category: true } });

    // Match components by name/keywords
    const matched: any[] = [];
    for (const comp of inventory) {
      const compName = (comp.name || "").toLowerCase();
      const tokens = compName.split(/[^a-z0-9]+/).filter((t: string) => t.length > 2);
      // match if full name present or at least 2 significant tokens present
      let score = 0;
      if (lowerText.includes(compName)) score += 5;
      for (const tok of tokens) {
        if (lowerText.includes(tok)) score += 1;
      }
      if (score >= 2) {
        matched.push({
          componentId: comp.id,
          code: comp.code,
          name: comp.name,
          categoryName: comp.category?.name || null,
          availableQuantity: comp.availableQuantity,
          totalQuantity: comp.totalQuantity,
          unit: comp.unit,
          imageUrl: comp.imageUrl,
          suggestedQuantity: 1,
          matchedScore: score,
        });
      }
    }

    // sort by score desc
    matched.sort((a, b) => b.matchedScore - a.matchedScore);

    return NextResponse.json({
      fileName: file.name,
      extractedText: text.substring(0, 2000),
      matchedComponents: matched,
      totalMatched: matched.length,
    });
  } catch (err: any) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: err?.message || "Failed to parse file" }, { status: 500 });
  }
}