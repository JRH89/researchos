import { NextResponse } from "next/server";
import { synthesize } from "@/lib/research/model";
import { listPapers, savePaper, workspaceSessions } from "@/lib/research/store";
import { authenticate } from "@/lib/auth/firebase-server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const auth = await authenticate(request); if ("response" in auth) return auth.response; return NextResponse.json(await listPapers((await params).id, auth.user.uid)); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if ("response" in auth) return auth.response;
  const workspaceId = (await params).id; const body: { sessionIds?: unknown; title?: unknown } = await request.json().catch(() => ({})); const sessions = await workspaceSessions(workspaceId, auth.user.uid);
  const selectedIds = Array.isArray(body.sessionIds) ? new Set(body.sessionIds.filter((id): id is string => typeof id === "string")) : new Set(sessions.map((session) => session.id));
  const selected = sessions.filter((session) => selectedIds.has(session.id));
  const evidence = selected.flatMap((session) => session.evidence).filter((item, index, all) => all.findIndex((other) => other.sourceUrl === item.sourceUrl && other.excerpt === item.excerpt) === index);
  if (!evidence.length) return NextResponse.json({ error: "Select completed research sessions with evidence before drafting a paper." }, { status: 400 });
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Workspace research paper";
  const report = await synthesize(`Write a comprehensive research paper titled '${title}' from the selected workspace evidence.`, evidence);
  const markdown = `# ${title}\n\n## Abstract\n\n${report.summary}\n\n## Findings\n\n${report.claims.map((claim, index) => `### ${index + 1}. ${claim.text}\n\nEvidence: ${claim.evidenceIds.map((id) => `[${evidence.findIndex((item) => item.id === id) + 1}]`).join(", ")}`).join("\n\n")}\n\n## Limitations\n\n${report.limitations.map((item) => `- ${item}`).join("\n")}\n\n## References\n\n${evidence.map((item, index) => `[${index + 1}] ${item.sourceTitle}. ${item.sourceUrl}`).join("\n")}`;
  return NextResponse.json(await savePaper(auth.user.uid, { workspaceId, title, contentMarkdown: markdown, citations: evidence, sourceSessionIds: selected.map((session) => session.id) }), { status: 201 });
}
