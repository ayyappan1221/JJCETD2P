import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueRecords, returnRecords, profiles, components } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth/rbac";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel } from "docx";

export async function GET(req: NextRequest) {
  const { error } = await requireRole("ADMIN", "D2P_INCHARGE");
  if (error) return error;

  const format = (req.nextUrl.searchParams.get("format") || "pdf").toLowerCase();

  // Load issue records with related data
  const issues = await db.query.issueRecords.findMany({
    with: { student: true, component: true, returns: true },
    orderBy: [desc(issueRecords.issuedAt)],
  });

  const rows = issues.map((ir: any) => {
    const totalReturned = (ir.returns || []).reduce((s: number, r: any) => s + (r.quantity || 0), 0);
    const outstanding = (ir.quantityIssued || 0) - totalReturned;
    return {
      reference: ir.reference,
      student: ir.student?.fullName || "-",
      component: ir.component?.name || "-",
      code: ir.component?.code || "-",
      issued: ir.quantityIssued,
      returned: totalReturned,
      outstanding,
      issuedAt: ir.issuedAt,
      expectedReturn: ir.expectedReturnDate,
      status: ir.status,
    };
  });

  if (format === "docx") {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: "JJCETD2P — Laboratory Borrowing Report", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleString()}`, spacing: { after: 200 } }),
          new Table({
            rows: [
              new TableRow({
                children: ["Reference", "Student", "Component", "Issued", "Returned", "Outstanding", "Status"].map(
                  (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
                ),
              }),
              ...rows.map((r) =>
                new TableRow({
                  children: [r.reference, r.student, r.component, String(r.issued), String(r.returned), String(r.outstanding), r.status].map(
                    (v) => new TableCell({ children: [new Paragraph(v)] })
                  ),
                })
              ),
            ],
          }),
        ],
      }],
    });
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="borrowing-report.docx"',
      },
    });
  }

  // PDF
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(16).text("JJCETD2P — Laboratory Borrowing Report", { align: "center" });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown();

  const headers = ["Reference", "Student", "Component", "Issued", "Returned", "Outstanding", "Status"];
  const colWidths = [90, 90, 120, 45, 50, 60, 70];
  let x = 40;
  let y = doc.y;
  headers.forEach((h, i) => { doc.fontSize(9).font("Helvetica-Bold").text(h, x, y, { width: colWidths[i] }); x += colWidths[i]; });
  doc.moveDown(0.5);
  y = doc.y;
  doc.moveTo(40, y).lineTo(555, y).stroke();
  doc.moveDown(0.5);

  for (const r of rows) {
    if (doc.y > 720) { doc.addPage(); }
    x = 40;
    y = doc.y;
    const vals = [r.reference, r.student, r.component, String(r.issued), String(r.returned), String(r.outstanding), r.status];
    vals.forEach((v, i) => { doc.fontSize(8).font("Helvetica").text(v, x, y, { width: colWidths[i] }); x += colWidths[i]; });
    doc.moveDown(0.8);
  }

  doc.end();
  const pdfBuffer = await done;
  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="borrowing-report.pdf"',
    },
  });
}