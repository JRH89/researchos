import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";
import { Pool } from "pg";
import { authenticate } from "@/lib/auth/firebase-server";

async function paper(id: string, ownerUid: string) { const db = new Pool({ connectionString: process.env.DATABASE_URL }); try { const r = await db.query("SELECT title, content_markdown FROM workspace_papers WHERE id = $1 AND owner_uid = $2", [id, ownerUid]); return r.rows[0]; } finally { await db.end(); } }
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const item = await paper((await params).id, auth.user.uid); if (!item) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") || "markdown"; const filename = item.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "research-paper";
  if (format === "docx") { const document = new Document({ sections: [{ children: item.content_markdown.split("\n").map((text: string) => new Paragraph({ children: [new TextRun(text)] })) }] }); return new NextResponse(new Uint8Array(await Packer.toBuffer(document)), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${filename}.docx"` } }); }
  if (format === "pdf") { const pdf = new PDFDocument({ margin: 54 }); const chunks: Buffer[] = []; pdf.on("data", (chunk) => chunks.push(chunk)); const complete = new Promise<Buffer>((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks)))); pdf.fontSize(18).text(item.title); pdf.moveDown(); pdf.fontSize(10).text(item.content_markdown); pdf.end(); return new NextResponse(new Uint8Array(await complete), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` } }); }
  return new NextResponse(item.content_markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.md"` } });
}
