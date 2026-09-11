import { writePaperBody } from "./model";
import { savePaper, workspaceSessions, type CitationStyle, type PaperMetadata, type WorkspacePaper } from "./store";
import type { Evidence } from "./contracts";

type PaperInput = { sessionIds?: unknown; title?: unknown; citationStyle?: unknown; targetWordCount?: unknown; sourceLimit?: unknown; paperType?: unknown; metadata?: unknown };
type Progress = (message: string, progress: number) => void;
const reference = (item: Evidence, style: CitationStyle) => {
  const date = item.publishedDate || "n.d."; const author = item.authors?.join(", ");
  return style === "APA" ? `${author ? `${author}. ` : ""}${item.sourceTitle}. (${date}). ${item.publisher || item.siteName ? `${item.publisher || item.siteName}. ` : ""}${item.sourceUrl}` : `${author ? `${author}. ` : ""}“${item.sourceTitle}.” ${item.publisher || item.siteName ? `${item.publisher || item.siteName}, ` : ""}${date}, ${item.sourceUrl}.`;
};

export async function draftWorkspacePaper(workspaceId: string, ownerUid: string, input: PaperInput, progress: Progress = () => {}) : Promise<WorkspacePaper> {
  progress("Validating saved research and evidence.", 12);
  const sessions = await workspaceSessions(workspaceId, ownerUid);
  const selectedIds = Array.isArray(input.sessionIds) ? new Set(input.sessionIds.filter((id): id is string => typeof id === "string")) : new Set(sessions.map((session) => session.id));
  const selected = sessions.filter((session) => selectedIds.has(session.id));
  const uniqueEvidence = selected.flatMap((session) => session.evidence).filter((item, index, all) => all.findIndex((other) => other.sourceUrl === item.sourceUrl && other.excerpt === item.excerpt) === index);
  if (!uniqueEvidence.length) throw new Error("Select completed research sessions with evidence before drafting a paper.");
  const confidencePoints = { high: 3, medium: 2, low: 1 } as const;
  const evidenceScores = new Map<string, number>();
  for (const session of selected) for (const claim of session.report.claims) for (const evidenceId of claim.evidenceIds) evidenceScores.set(evidenceId, (evidenceScores.get(evidenceId) || 0) + confidencePoints[claim.confidence]);
  const sourceLimit = Math.max(2, Math.min(20, typeof input.sourceLimit === "number" ? Math.floor(input.sourceLimit) : 5));
  const rankedEvidence = [...uniqueEvidence].sort((left, right) => (evidenceScores.get(right.id) || 0) - (evidenceScores.get(left.id) || 0) || right.excerpt.length - left.excerpt.length);
  // Give every checked research run a voice before using the remaining top-ranked sources.
  const evidence: Evidence[] = [];
  for (const session of selected) {
    const bestForRun = rankedEvidence.find((item) => session.evidence.some((candidate) => candidate.id === item.id));
    if (bestForRun && !evidence.some((item) => item.id === bestForRun.id)) evidence.push(bestForRun);
  }
  for (const item of rankedEvidence) if (evidence.length < sourceLimit && !evidence.some((candidate) => candidate.id === item.id)) evidence.push(item);
  const title = typeof input.title === "string" && input.title.trim() ? input.title.trim() : "Workspace research paper";
  const citationStyle: CitationStyle = input.citationStyle === "MLA" ? "MLA" : "APA";
  const targetWordCount = Math.max(250, Math.min(10000, typeof input.targetWordCount === "number" ? input.targetWordCount : 1000));
  const rawMetadata = typeof input.metadata === "object" && input.metadata ? input.metadata as Record<string, unknown> : {};
  const paperType = input.paperType === "essay" ? "essay" : "research-paper";
  const metadata: PaperMetadata = { authorName: typeof rawMetadata.authorName === "string" ? rawMetadata.authorName.trim() : "", courseName: typeof rawMetadata.courseName === "string" ? rawMetadata.courseName.trim() : "", instructorName: typeof rawMetadata.instructorName === "string" ? rawMetadata.instructorName.trim() : "", date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), paperType };
  progress(`Writing a ${citationStyle} ${paperType === "essay" ? "essay" : "research paper"} from the top ${evidence.length} sources.`, 42);
  const titlePattern = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = (await writePaperBody({ title, paperType, citationStyle, targetWordCount, researchQuestions: selected.map((session) => session.question), evidence })).replace(new RegExp(`^\\s*(?:#\\s*)?${titlePattern}\\s*\\n+`, "i"), "").trim();
  progress("Formatting headings, citations, and references.", 76);
  const mlaHeading = `${metadata.authorName}  \n${metadata.instructorName}  \n${metadata.courseName}  \n${metadata.date}\n\n# ${title}`;
  const apaTitlePage = `# ${title}\n\n${metadata.authorName}  \n${metadata.courseName}  \n${metadata.instructorName}  \n${metadata.date}`;
  const heading = citationStyle === "MLA" ? mlaHeading : `${apaTitlePage}\n\n---\n\n# ${title}`;
  const referencesTitle = citationStyle === "MLA" ? "Works Cited" : "References";
  const markdown = `${heading}\n\n${body}\n\n---\n\n## ${referencesTitle}\n\n${evidence.map((item) => reference(item, citationStyle)).join("\n\n")}`;
  progress("Saving the paper to this workspace.", 92);
  return savePaper(ownerUid, { workspaceId, title, contentMarkdown: markdown, citations: evidence, sourceSessionIds: selected.map((session) => session.id), citationStyle, targetWordCount, paperMetadata: metadata });
}
