"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Evidence, ResearchSession } from "@/lib/research/contracts";
import type { CitationStyle, Workspace, WorkspacePaper, WorkspaceRun, WritingProfile } from "@/lib/research/store";
import { firebaseAuth, firebaseConfigured } from "@/lib/auth/firebase-client";

const api = (path: string) => {
  const localBrowser = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return `${localBrowser ? "" : process.env.NEXT_PUBLIC_API_BASE_URL || ""}${path}`;
};

const defaultQuestion = "Compare approaches for running coding agents against local LLMs with 12–16 GB VRAM.";
const kindIcon: Record<string, string> = { plan: "◎", tool: "→", evaluation: "✓", approval: "◌", recovery: "!", synthesis: "✦" };

function Provenance({ evidence }: { evidence: Evidence[] }) {
  return <section className="provenance"><p className="eyebrow">Evidence chain</p>{evidence.length === 0 ? <p>No linked evidence.</p> : evidence.map((item) => <article className="source" key={item.id}>
    <div><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceTitle} ↗</a><p>“{item.excerpt}”</p></div>
    <small>MCP server: {item.server}<br />Tool call: {item.toolCallId.slice(0, 8)}<br />Trace step: {item.traceStepId.slice(0, 8)}</small>
  </article>)}</section>;
}

export function ResearchWorkbench() {
  const [question, setQuestion] = useState(defaultQuestion);
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTrace, setLiveTrace] = useState<ResearchSession["trace"]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [paper, setPaper] = useState<WorkspacePaper | null>(null);
  const [workspaceRuns, setWorkspaceRuns] = useState<WorkspaceRun[]>([]);
  const [writingProfiles, setWritingProfiles] = useState<WritingProfile[]>([]);
  const [profileName, setProfileName] = useState("");
  const [paperTitle, setPaperTitle] = useState("Workspace research paper");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("APA");
  const [targetWordCount, setTargetWordCount] = useState(1000);
  const [paperMetadata, setPaperMetadata] = useState({ authorName: "", courseName: "", instructorName: "" });
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const streamListRef = useRef<HTMLDivElement>(null);
  const followLiveRef = useRef(true);
  useEffect(() => {
    const list = streamListRef.current;
    if (list && followLiveRef.current) list.scrollTop = list.scrollHeight;
  }, [liveTrace.length]);
  useEffect(() => {
    if (!firebaseConfigured) { setAuthError("Firebase is not configured for this deployment."); return; }
    return onAuthStateChanged(firebaseAuth(), async (nextUser) => { setUser(nextUser); setIdToken(nextUser ? await nextUser.getIdToken() : null); });
  }, []);
  useEffect(() => { if (!idToken) { setWorkspaces([]); return; } void fetch(api("/api/workspaces"), { headers: { Authorization: `Bearer ${idToken}` } }).then((response) => response.ok ? response.json() : []).then(setWorkspaces).catch(() => setWorkspaces([])); }, [idToken]);
  useEffect(() => { if (!idToken) { setWritingProfiles([]); return; } void fetch(api("/api/writing-profiles"), { headers: { Authorization: `Bearer ${idToken}` } }).then((response) => response.ok ? response.json() : []).then(setWritingProfiles).catch(() => setWritingProfiles([])); }, [idToken]);
  useEffect(() => { if (!idToken || !workspaceId) { setWorkspaceRuns([]); return; } void fetch(api(`/api/workspaces/${workspaceId}/sessions`), { headers: { Authorization: `Bearer ${idToken}` } }).then((response) => response.ok ? response.json() : []).then(setWorkspaceRuns).catch(() => setWorkspaceRuns([])); }, [idToken, workspaceId, session?.id]);
  const authenticatedHeaders = () => ({ "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) });
  async function withAuth(action: () => Promise<void>) { setAuthError(null); setAuthLoading(true); try { await action(); } catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Sign-in failed."); } finally { setAuthLoading(false); } }
  async function signInGoogle() { await withAuth(() => signInWithPopup(firebaseAuth(), new GoogleAuthProvider()).then(() => undefined)); }
  async function signInEmail(register = false) { await withAuth(() => (register ? createUserWithEmailAndPassword(firebaseAuth(), email, password) : signInWithEmailAndPassword(firebaseAuth(), email, password)).then(() => undefined)); }
  function updateFollowMode() {
    const list = streamListRef.current;
    if (list) followLiveRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 12;
  }
  async function run() {
    if (!idToken) { setError("Sign in before running research."); return; }
    setRunning(true); setSession(null); setSelectedEvidence([]); setError(null); setLiveTrace([]); followLiveRef.current = true;
    try {
      const response = await fetch(api("/api/research/stream"), { method: "POST", headers: authenticatedHeaders(), body: JSON.stringify({ question, workspaceId: workspaceId || undefined }) });
      if (!response.ok || !response.body) throw new Error("The research stream could not start.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const event = frame.match(/^event: (.+)$/m)?.[1]; const data = frame.match(/^data: (.+)$/m)?.[1]; if (!event || !data) continue;
          const payload = JSON.parse(data);
          if (event === "trace") setLiveTrace((current) => [...current, payload]);
          if (event === "complete") setSession(payload);
          if (event === "error") throw new Error(payload.detail || "The research run failed.");
        }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The research run failed."); }
    finally { setRunning(false); }
  }
  async function createNewWorkspace() {
    const name = window.prompt("Workspace name"); if (!name?.trim()) return;
    const response = await fetch(api("/api/workspaces"), { method: "POST", headers: authenticatedHeaders(), body: JSON.stringify({ name }) });
    if (!response.ok) { setError("Could not create the workspace."); return; }
    const workspace: Workspace = await response.json(); setWorkspaces((current) => [workspace, ...current]); setWorkspaceId(workspace.id);
  }
  async function draftPaper() {
    if (!workspaceId) { setError("Choose a workspace before drafting a paper."); return; }
    const response = await fetch(api(`/api/workspaces/${workspaceId}/papers`), { method: "POST", headers: authenticatedHeaders(), body: JSON.stringify({ title: paperTitle, citationStyle, targetWordCount, metadata: paperMetadata }) });
    const body = await response.json(); if (!response.ok) { setError(body.error || "Could not draft a paper."); return; } setPaper(body);
  }
  function applyWritingProfile(id: string) { const profile = writingProfiles.find((item) => item.id === id); if (!profile) return; setProfileName(profile.name); setCitationStyle(profile.citationStyle); setTargetWordCount(profile.targetWordCount); setPaperMetadata({ authorName: profile.authorName, courseName: profile.courseName, instructorName: profile.instructorName }); }
  async function saveWritingProfile() { if (!profileName.trim()) { setError("Give this writing profile a name, such as 'History 201'."); return; } const response = await fetch(api("/api/writing-profiles"), { method: "POST", headers: authenticatedHeaders(), body: JSON.stringify({ name: profileName, citationStyle, targetWordCount, ...paperMetadata }) }); const body = await response.json(); if (!response.ok) { setError(body.error || "Could not save the writing profile."); return; } setWritingProfiles((current) => [body, ...current]); }
  async function openWorkspaceRun(runId: string) { if (!runId || !idToken) return; const response = await fetch(api(`/api/research/${runId}`), { headers: { Authorization: `Bearer ${idToken}` } }); if (!response.ok) { setError("That saved research run is no longer available."); return; } setSelectedEvidence([]); setPaper(null); setSession(await response.json()); }
  async function downloadPaper(format: "docx" | "pdf" | "markdown") { if (!paper || !idToken) return; const response = await fetch(api(`/api/papers/${paper.id}/export?format=${format}`), { headers: { Authorization: `Bearer ${idToken}` } }); if (!response.ok) { setError("Could not download the paper."); return; } const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${paper.title}.${format === "markdown" ? "md" : format}`; anchor.click(); URL.revokeObjectURL(url); }
  return <div className="shell">
    <header><div className="brand"><span className="mark">R</span><span>ResearchOS</span></div><div className="header-actions"><span className="pill">MCP research runtime</span>{user && <button type="button" onClick={() => void signOut(firebaseAuth())}>Sign out</button>}</div></header>
    {!user && <div className="auth-overlay"><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title"><p className="eyebrow">ResearchOS account</p><h2 id="auth-title">Research with a record.</h2><p className="auth-copy">Sign in to save workspaces, evidence trails, and cited papers.</p><button className="google-button" type="button" disabled={authLoading || !firebaseConfigured} onClick={() => void signInGoogle()}>Continue with Google</button><div className="auth-divider"><span>or use email</span></div><label>Email address<input type="email" value={email} placeholder="you@example.com" autoComplete="email" onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" value={password} placeholder="At least 6 characters" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} /></label><div className="auth-actions"><button type="button" disabled={authLoading || !email || password.length < 6} onClick={() => void signInEmail(false)}>Sign in</button><button className="secondary" type="button" disabled={authLoading || !email || password.length < 6} onClick={() => void signInEmail(true)}>Create account</button></div>{authError && <p className="run-error" role="alert">{authError}</p>}</section></div>}
    <section className="hero"><p className="eyebrow">Evidence, not just answers</p><h1>Watch a research agent<br /><em>earn its conclusions.</em></h1><p className="lede">Plans, dynamically discovers MCP tools, evaluates sources, and preserves the path from each claim to its evidence.</p></section>
    <section className="workspace-picker"><label htmlFor="workspace">Research workspace</label><select id="workspace" value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}><option value="">Unfiled session</option>{workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select><button type="button" onClick={createNewWorkspace}>New workspace</button></section>
    {workspaceId && <section className="run-picker"><label htmlFor="saved-run">Saved research</label><select id="saved-run" value={session?.id || ""} onChange={(event) => void openWorkspaceRun(event.target.value)}><option value="">Choose a previous research run</option>{workspaceRuns.map((run) => <option value={run.id} key={run.id}>{run.question.slice(0, 72)}{run.question.length > 72 ? "…" : ""}</option>)}</select><small>{workspaceRuns.length ? `${workspaceRuns.length} saved run${workspaceRuns.length === 1 ? "" : "s"} in this workspace` : "New research in this workspace will be saved here."}</small></section>}
    {workspaceId && <section className="paper-setup"><div className="paper-setup-title"><p className="eyebrow">Paper setup</p><h2>Format a cited paper</h2></div><div className="profile-row"><select aria-label="Saved writing profile" defaultValue="" onChange={(event) => applyWritingProfile(event.target.value)}><option value="">Apply a saved writing profile</option>{writingProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><input value={profileName} placeholder="Profile name (e.g. Biology 101)" onChange={(event) => setProfileName(event.target.value)} /><button type="button" onClick={() => void saveWritingProfile()}>Save profile</button></div><div className="paper-fields"><label>Paper title<input value={paperTitle} onChange={(event) => setPaperTitle(event.target.value)} /></label><label>Citation style<select value={citationStyle} onChange={(event) => setCitationStyle(event.target.value as CitationStyle)}><option value="APA">APA</option><option value="MLA">MLA</option></select></label><label>Target words<input type="number" min="250" max="10000" step="50" value={targetWordCount} onChange={(event) => setTargetWordCount(Number(event.target.value))} /></label><label>Your name<input value={paperMetadata.authorName} onChange={(event) => setPaperMetadata((current) => ({ ...current, authorName: event.target.value }))} /></label><label>Course / class<input value={paperMetadata.courseName} onChange={(event) => setPaperMetadata((current) => ({ ...current, courseName: event.target.value }))} /></label><label>Professor / instructor<input value={paperMetadata.instructorName} onChange={(event) => setPaperMetadata((current) => ({ ...current, instructorName: event.target.value }))} /></label></div></section>}
    <section className="question"><label htmlFor="question">Research question</label><textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} /><button onClick={run} disabled={running || !user}>{running ? "Running bounded research…" : user ? "Run research →" : "Sign in to run research"}</button><small>Read-only tools run automatically. Mutating and paid tools stop for approval.</small></section>
    {error && <p className="run-error" role="alert">Research run failed: {error}</p>}
    {running && <div className="live-overlay" role="dialog" aria-modal="true" aria-labelledby="live-agent-title"><section className="live-run" aria-live="polite"><div className="section-title"><p className="eyebrow" id="live-agent-title">Live agent activity</p><span>{Math.min(92, 8 + liveTrace.length * 11)}%</span></div><div className="progress"><i style={{ width: `${Math.min(92, 8 + liveTrace.length * 11)}%` }} /></div><p className="stream-note">Showing the newest five events. Scroll up to inspect earlier activity.</p><div className="stream-list" ref={streamListRef} onScroll={updateFollowMode}>{liveTrace.length ? liveTrace.map((item) => <div className={`trace-item ${item.status}`} key={item.id}><i>{kindIcon[item.kind]}</i><strong>{item.message}</strong></div>) : <p className="waiting">Connecting to research runtime…</p>}</div></section></div>}
    {!session && !running && <section className="empty"><span>01 — Plan</span><span>02 — Gather</span><span>03 — Evaluate</span><span>04 — Synthesize</span></section>}
    {session && <section className="workspace">
      <aside className="trace"><div className="section-title"><p className="eyebrow">Live execution trace</p><span className="complete">{session.status}</span></div>{session.trace.map((item) => <div className={`trace-item ${item.status}`} key={item.id}><i>{kindIcon[item.kind]}</i><div><strong>{item.message}</strong>{item.detail && <p>{item.detail}</p>}</div></div>)}<div className="budget">{session.budget.toolCallsUsed}/{session.budget.maxToolCalls} tool calls · {session.budget.iterationsUsed}/{session.budget.maxIterations} iterations · {session.budget.elapsedMs}ms</div></aside>
      <article className="report"><p className="eyebrow">Research report</p><h2>{session.question}</h2><p className="summary">{session.report.summary}</p><div className="claims">{session.report.claims.map((claim) => { const linked = session.evidence.filter((item) => claim.evidenceIds.includes(item.id)); return <button className="claim" onClick={() => setSelectedEvidence(linked)} key={claim.id}><span className={`confidence ${claim.confidence}`}>{claim.confidence} confidence</span><span>{claim.text}</span><b>{linked.length} evidence {linked.length === 1 ? "link" : "links"} →</b></button>; })}</div><div className="limits"><strong>Research limitations</strong>{session.report.limitations.map((item) => <p key={item}>{item}</p>)}</div></article>
      <Provenance evidence={selectedEvidence.length ? selectedEvidence : session.evidence} />
    </section>}
    {session && <section className="paper-actions"><button onClick={draftPaper} disabled={!workspaceId}>Draft cited paper from workspace</button><small>{workspaceId ? "Combines evidence from all saved sessions in this workspace." : "Choose a workspace to enable paper drafting."}</small></section>}
    {paper && <section className="paper-preview"><div><p className="eyebrow">Workspace paper · {paper.citationStyle} · {paper.targetWordCount.toLocaleString()} word target</p><h2>{paper.title}</h2><div className="paper-downloads"><button onClick={() => navigator.clipboard.writeText(paper.contentMarkdown)}>Copy</button><button onClick={() => void downloadPaper("docx")}>Download DOCX</button><button onClick={() => void downloadPaper("pdf")}>Download PDF</button><button onClick={() => void downloadPaper("markdown")}>Markdown</button></div></div><article className="paper-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{paper.contentMarkdown}</ReactMarkdown></article></section>}
  </div>;
}
