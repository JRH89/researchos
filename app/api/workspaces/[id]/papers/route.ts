import { NextResponse } from "next/server";
import { synthesize } from "@/lib/research/model";
import { listPapers, savePaper, workspaceSessions } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await listPapers((await params).id, auth.user.uid)); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const workspaceId = (await params).id; const body: { sessionIds?: unknown; title?: unknown; citationStyle?: unknown; targetWordCount?: unknown; metadata?: unknown } = await request.json().catch(() => ({})); const sessions = await workspaceSessions(workspaceId, auth.user.uid);
  const selectedIds = Array.isArray(body.sessionIds) ? new Set(body.sessionIds.filter((id): id is string => typeof id === "string")) : new Set(sessions.map((session) => session.id));
  const selected = sessions.filter((session) => selectedIds.has(session.id));
  const evidence = selected.flatMap((session) => session.evidence).filter((item, index, all) => all.findIndex((other) => other.sourceUrl === item.sourceUrl && other.excerpt === item.excerpt) === index);
  if (!evidence.length) return NextResponse.json({ error: "Select completed research sessions with evidence before drafting a paper." }, { status: 400 });
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Workspace research paper";
  const citationStyle = body.citationStyle === "MLA" ? "MLA" : "APA";
  const targetWordCount = Math.max(250, Math.min(10000, typeof body.targetWordCount === "number" ? body.targetWordCount : 1000));
  const rawMetadata = typeof body.metadata === "object" && body.metadata ? body.metadata as Record<string, unknown> : {};
  const metadata = { authorName: typeof rawMetadata.authorName === "string" ? rawMetadata.authorName.trim() : "", courseName: typeof rawMetadata.courseName === "string" ? rawMetadata.courseName.trim() : "", instructorName: typeof rawMetadata.instructorName === "string" ? rawMetadata.instructorName.trim() : "", date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) };
  const report = await synthesize(`Write a comprehensive ${citationStyle}-style research paper titled '${title}' from the selected workspace evidence. Aim for approximately ${targetWordCount} words. Use only supplied evidence and do not invent facts.`, evidence);
  const heading = citationStyle === "MLA" ? `${metadata.authorName}\n${metadata.instructorName}\n${metadata.courseName}\n${metadata.date}\n\n# ${title}` : `# ${title}\n\n${metadata.authorName}\n${metadata.courseName}\n${metadata.instructorName}\n${metadata.date}`;
  const markdown = `${heading}\n\n## Abstract\n\n${report.summary}\n\n## Findings\n\n${report.claims.map((claim, index) => `### ${index + 1}. ${claim.text}\n\nEvidence: ${claim.evidenceIds.map((id) => `[${evidence.findIndex((item) => item.id === id) + 1}]`).join(", ")}`).join("\n\n")}\n\n## Limitations\n\n${report.limitations.map((item) => `- ${item}`).join("\n")}\n\n## References\n\n${evidence.map((item, index) => `${citationStyle === "MLA" ? `${item.sourceTitle}. ` : ""}${item.sourceTitle}. ${item.sourceUrl}`).join("\n")}`;
  return NextResponse.json(await savePaper(auth.user.uid, { workspaceId, title, contentMarkdown: markdown, citations: evidence, sourceSessionIds: selected.map((session) => session.id), citationStyle, targetWordCount, paperMetadata: metadata }), { status: 201 });
}
