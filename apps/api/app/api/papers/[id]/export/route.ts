import { NextResponse } from "next/server";
import { AlignmentType, Document, Header, PageBreak, PageNumber, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";
import { Pool } from "pg";
import { authenticate } from "@/lib/auth/firebase-server";
import { runtimeEnv } from "@/lib/runtime-env";

export const runtime = "nodejs";

async function paper(id: string, ownerUid: string) { const connectionString = runtimeEnv("DATABASE_URL"); if (!connectionString) throw new Error("DATABASE_URL is required for paper exports."); const db = new Pool({ connectionString }); try { const r = await db.query("SELECT title, content_markdown, citation_style, paper_metadata FROM workspace_papers WHERE id = $1 AND owner_uid = $2", [id, ownerUid]); return r.rows[0]; } finally { await db.end(); } }
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const item = await paper((await params).id, auth.user.uid); if (!item) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") || "markdown"; const filename = item.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "research-paper";
  if (format === "docx") { const pages = item.content_markdown.split("\n---\n"); const lastName = item.paper_metadata?.authorName?.trim().split(/\s+/).at(-1) || ""; const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: item.citation_style === "MLA" && lastName ? [new TextRun(`${lastName} `), new TextRun({ children: [PageNumber.CURRENT] })] : [new TextRun({ children: [PageNumber.CURRENT] })] })] }); const children = pages.flatMap((page: string, pageIndex: number) => [...(pageIndex ? [new Paragraph({ children: [new PageBreak()] })] : []), ...page.split("\n").map((line: string) => { const text = line.replace(/^#{1,3}\s*/, "").replace(/\*\*/g, "").trimEnd(); return new Paragraph({ alignment: line.startsWith("# ") ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { line: 480, after: 0 }, children: [new TextRun({ text, font: "Times New Roman", size: 24, bold: line.startsWith("#") })] }); })]); const document = new Document({ sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, children }] }); return new NextResponse(new Uint8Array(await Packer.toBuffer(document)), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Content-Disposition": `attachment; filename="${filename}.docx"` } }); }
  if (format === "pdf") { const pdf = new PDFDocument({ margin: 54 }); const chunks: Buffer[] = []; pdf.on("data", (chunk) => chunks.push(chunk)); const complete = new Promise<Buffer>((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks)))); item.content_markdown.split("\n---\n").forEach((page: string, index: number) => { if (index) pdf.addPage(); if (!index) { pdf.fontSize(18).text(item.title); pdf.moveDown(); } pdf.fontSize(10).text(page); }); pdf.end(); return new NextResponse(new Uint8Array(await complete), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` } }); }
  return new NextResponse(item.content_markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.md"` } });
  } catch (error) {
    return NextResponse.json({ error: "Paper export failed.", detail: error instanceof Error ? error.message : "Unknown export error." }, { status: 500 });
  }
}
