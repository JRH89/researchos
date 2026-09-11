"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, onIdTokenChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CitationStyle, Evidence, ResearchSession, Workspace, WorkspacePaper, WorkspaceRun, WritingProfile } from "@/lib/contracts";
import { firebaseAuth, firebaseConfigured } from "@/lib/auth/firebase-client";

const api = (path: string) => {
  const base = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
  return `${base}${path}`;
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
  const [activeTab, setActiveTab] = useState<"research" | "paper">("research");
  const [paper, setPaper] = useState<WorkspacePaper | null>(null);
  const [workspaceRuns, setWorkspaceRuns] = useState<WorkspaceRun[]>([]);
  const [selectedPaperRunIds, setSelectedPaperRunIds] = useState<string[]>([]);
  const [writingProfiles, setWritingProfiles] = useState<WritingProfile[]>([]);
  const [profileName, setProfileName] = useState("");
  const [paperTitle, setPaperTitle] = useState("Workspace research paper");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("APA");
  const [targetWordCount, setTargetWordCount] = useState(1000);
  const [sourceLimit, setSourceLimit] = useState(5);
  const [paperType, setPaperType] = useState<"research-paper" | "essay">("research-paper");
  const [paperMetadata, setPaperMetadata] = useState({ authorName: "", courseName: "", instructorName: "" });
  const [paperWriting, setPaperWriting] = useState(false);
  const [paperProgress, setPaperProgress] = useState<{ text: string; progress: number }[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const streamListRef = useRef<HTMLDivElement>(null);
  const followLiveRef = useRef(true);
  useEffect(() => {
    const list = streamListRef.current;
    if (list && followLiveRef.current) list.scrollTop = list.scrollHeight;
  }, [liveTrace.length]);
  useEffect(() => {
    if (!firebaseConfigured) { setAuthError("Firebase is not configured for this deployment."); return; }
    return onIdTokenChanged(firebaseAuth(), async (nextUser) => { setUser(nextUser); setIdToken(nextUser ? await nextUser.getIdToken(true) : null); });
  }, []);
  useEffect(() => { if (!idToken) { setWorkspaces([]); return; } void authFetch("/api/workspaces").then((response) => response.ok ? response.json() : []).then(setWorkspaces).catch(() => setWorkspaces([])); }, [idToken]);
  useEffect(() => { if (!idToken) { setWritingProfiles([]); return; } void authFetch("/api/writing-profiles").then((response) => response.ok ? response.json() : []).then(setWritingProfiles).catch(() => setWritingProfiles([])); }, [idToken]);
  useEffect(() => { if (!idToken || !workspaceId) { setWorkspaceRuns([]); setSelectedPaperRunIds([]); return; } void authFetch(`/api/workspaces/${workspaceId}/sessions`).then((response) => response.ok ? response.json() : []).then((runs: WorkspaceRun[]) => { setWorkspaceRuns(runs); setSelectedPaperRunIds((current) => current.length ? current.filter((id) => runs.some((run) => run.id === id)) : runs.map((run) => run.id)); }).catch(() => setWorkspaceRuns([])); }, [idToken, workspaceId, session?.id]);
  async function authenticatedHeaders(forceRefresh = false) {
    const currentUser = firebaseConfigured ? firebaseAuth().currentUser : null;
    const token = currentUser ? await currentUser.getIdToken(forceRefresh) : idToken;
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }
  async function authFetch(path: string, init: RequestInit = {}) {
    const request = async (forceRefresh = false) => fetch(api(path), { ...init, headers: { ...(await authenticatedHeaders(forceRefresh)), ...init.headers } });
    const response = await request();
    return response.status === 401 && firebaseAuth().currentUser ? request(true) : response;
  }
  async function withAuth(action: () => Promise<void>) { setAuthError(null); setAuthLoading(true); try { await action(); } catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Sign-in failed."); } finally { setAuthLoading(false); } }
  async function signInGoogle() { await withAuth(() => signInWithPopup(firebaseAuth(), new GoogleAuthProvider()).then(() => undefined)); }
  async function signInEmail(register = false) { await withAuth(() => (register ? createUserWithEmailAndPassword(firebaseAuth(), email, password) : signInWithEmailAndPassword(firebaseAuth(), email, password)).then(() => undefined)); }
  function updateFollowMode() {
    const list = streamListRef.current;
    if (list) followLiveRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 12;
  }
  async function run() {
    if (!user) { setError("Sign in before running research."); return; }
    setRunning(true); setSession(null); setSelectedEvidence([]); setError(null); setLiveTrace([]); followLiveRef.current = true;
    try {
      const response = await authFetch("/api/research/stream", { method: "POST", body: JSON.stringify({ question, workspaceId: workspaceId || undefined }) });
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
    const response = await authFetch("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
    if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string; detail?: string } | null; setError(body?.detail || body?.error || "Could not create the workspace."); return; }
    const workspace: Workspace = await response.json(); setWorkspaces((current) => [workspace, ...current]); setWorkspaceId(workspace.id);
  }
  async function draftPaper() {
    if (!workspaceId) { setError("Choose a workspace before drafting a paper."); return; }
    setPaperWriting(true); setPaperProgress([{ text: "Preparing your paper request.", progress: 4 }]); setError(null);
    try {
      const response = await authFetch(`/api/workspaces/${workspaceId}/papers/stream`, { method: "POST", body: JSON.stringify({ sessionIds: selectedPaperRunIds, title: paperTitle, citationStyle, targetWordCount, sourceLimit, paperType, metadata: paperMetadata }) });
      if (!response.ok || !response.body) throw new Error("The paper stream could not start.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const frames = buffer.split("\n\n"); buffer = frames.pop() ?? ""; for (const frame of frames) { const event = frame.match(/^event: (.+)$/m)?.[1]; const data = frame.match(/^data: (.+)$/m)?.[1]; if (!event || !data) continue; const payload = JSON.parse(data); if (event === "progress") setPaperProgress((current) => [...current, payload]); if (event === "complete") setPaper(payload); if (event === "error") throw new Error(payload.detail || "Paper drafting failed."); } }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not draft the paper."); }
    finally { setPaperWriting(false); }
  }
  function applyWritingProfile(id: string) { const profile = writingProfiles.find((item) => item.id === id); if (!profile) return; setProfileName(profile.name); setCitationStyle(profile.citationStyle); setTargetWordCount(profile.targetWordCount); setPaperMetadata({ authorName: profile.authorName, courseName: profile.courseName, instructorName: profile.instructorName }); }
  async function saveWritingProfile() { if (!profileName.trim()) { setError("Give this writing profile a name, such as 'History 201'."); return; } const response = await authFetch("/api/writing-profiles", { method: "POST", body: JSON.stringify({ name: profileName, citationStyle, targetWordCount, ...paperMetadata }) }); const body = await response.json(); if (!response.ok) { setError(body.error || "Could not save the writing profile."); return; } setWritingProfiles((current) => [body, ...current]); }
  async function openWorkspaceRun(runId: string) { if (!runId || !user) return; const response = await authFetch(`/api/research/${runId}`); if (!response.ok) { setError("That saved research run is no longer available."); return; } setSelectedEvidence([]); setPaper(null); setSession(await response.json()); }
  async function downloadPaper(format: "docx" | "pdf" | "markdown") { if (!paper || !user) return; const response = await authFetch(`/api/papers/${paper.id}/export?format=${format}`); if (!response.ok) { const detail = await response.json().catch(() => null) as { error?: string; detail?: string } | null; setError(detail?.detail || detail?.error || "Could not download the paper."); return; } const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${paper.title}.${format === "markdown" ? "md" : format}`; anchor.click(); URL.revokeObjectURL(url); }
  if (!user) return <div className="shell public-shell">
    <header className="public-header"><a className="brand" href="#top"><span className="mark">R</span><span>ResearchOS</span></a><button className="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><i /><i /><i /></button><nav className={mobileNavOpen ? "public-nav open" : "public-nav"}><a href="#features" onClick={() => setMobileNavOpen(false)}>Features</a><a href="#how-it-works" onClick={() => setMobileNavOpen(false)}>How it works</a><a href="#about" onClick={() => setMobileNavOpen(false)}>About</a><a href="#faq" onClick={() => setMobileNavOpen(false)}>FAQ</a></nav><div className="header-actions"><button type="button" onClick={() => setShowAuth(true)}>Sign in</button></div></header>
    <main className="public-home" id="top">
      <section className="public-hero"><p className="eyebrow">Evidence-backed research</p><h1>Find answers<br /><em>you can trace.</em></h1><p>ResearchOS turns a question into a transparent research process: plan, source, evaluate, and write with evidence still attached.</p><div className="public-cta"><button type="button" onClick={() => setShowAuth(true)}>Start researching</button><a href="#how-it-works">See how it works ↓</a></div></section>
      <section className="public-features" id="features"><article><img src="/images/landing/research-workflow.png" alt="Research workflow illustration" /><span>01</span><h2>Plan before search</h2><p>Break a broad question into focused objectives before the agent opens a source.</p></article><article><img src="/images/landing/provenance-chain.png" alt="Provenance chain illustration" /><span>02</span><h2>Inspect the evidence</h2><p>Follow a claim back through its excerpt, source, MCP tool, and trace event.</p></article><article><img src="/images/landing/cited-paper.png" alt="Cited paper illustration" /><span>03</span><h2>Write from research</h2><p>Build essays and papers from the selected runs—not a generic chat response.</p></article></section>
      <section className="public-split" id="how-it-works"><div><p className="eyebrow">How it works</p><h2>Research is a process, not one prompt.</h2><p>ResearchOS dynamically discovers connected MCP tools, keeps each tool result bounded, and shows the resulting trace while it works.</p><ol><li>Frame objectives from the question.</li><li>Gather and validate source evidence.</li><li>Compare confidence and surface gaps.</li><li>Generate a cited report or paper from selected research runs.</li></ol></div><img src="/images/landing/research-workflow.png" alt="Five-stage research workflow" /></section>
      <section className="public-about" id="about"><p className="eyebrow">About ResearchOS</p><h2>Built for students and researchers who need to show their work.</h2><p>Instead of hiding the path to an answer, ResearchOS keeps the links between a question, its sources, the tools used, and the final claims. That makes it easier to review, challenge, and improve the result.</p></section>
      <section className="public-faq" id="faq"><p className="eyebrow">FAQ</p><h2>Questions before you begin.</h2><details><summary>What does ResearchOS save?</summary><p>Workspaces save their research runs, evidence trails, and generated papers under your account. Unfiled work is temporary.</p></details><details><summary>Can I review a source behind a claim?</summary><p>Yes. Each claim is linked to the evidence records and the MCP tool call that produced them.</p></details><details><summary>Can I write a paper from more than one research run?</summary><p>Yes. Select the saved runs you want to include, choose APA or MLA, set a word target, and generate from that selected evidence.</p></details><details><summary>Does ResearchOS replace source review?</summary><p>No. It makes source review easier by preserving provenance; you should still evaluate evidence for your assignment or research context.</p></details></section>
    </main>
    <footer className="public-footer"><a className="brand" href="#top"><span className="mark">R</span><span>ResearchOS</span></a><span>Evidence, not just answers.</span><nav><a href="#features">Features</a><a href="#about">About</a><a href="#faq">FAQ</a><button type="button" onClick={() => setShowAuth(true)}>Sign in</button></nav></footer>
    {showAuth && <div className="auth-overlay"><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="auth-close" type="button" aria-label="Close sign in" onClick={() => setShowAuth(false)}>×</button><p className="eyebrow">ResearchOS account</p><h2 id="auth-title">Research with a record.</h2><p className="auth-copy">Sign in to save workspaces, evidence trails, and cited papers.</p><button className="google-button" type="button" disabled={authLoading || !firebaseConfigured} onClick={() => void signInGoogle()}>Continue with Google</button><div className="auth-divider"><span>or use email</span></div><label>Email address<input type="email" value={email} placeholder="you@example.com" autoComplete="email" onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" value={password} placeholder="At least 6 characters" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} /></label><div className="auth-actions"><button type="button" disabled={authLoading || !email || password.length < 6} onClick={() => void signInEmail(false)}>Sign in</button><button className="secondary" type="button" disabled={authLoading || !email || password.length < 6} onClick={() => void signInEmail(true)}>Create account</button></div>{authError && <p className="run-error" role="alert">{authError}</p>}</section></div>}
  </div>;
  return <div className="shell">
    <header><div className="brand"><span className="mark">R</span><span>ResearchOS</span></div><div className="header-actions"><span className="pill">MCP research runtime</span>{user && <button type="button" onClick={() => void signOut(firebaseAuth())}>Sign out</button>}</div></header>
    {!user && <div className="auth-overlay"><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title"><p className="eyebrow">ResearchOS account</p><h2 id="auth-title">Research with a record.</h2><p className="auth-copy">Sign in to save workspaces, evidence trails, and cited papers.</p><button className="google-button" type="button" disabled={authLoading || !firebaseConfigured} onClick={() => void signInGoogle()}>Continue with Google</button><div className="auth-divider"><span>or use email</span></div><label>Email address<input type="email" value={email} placeholder="you@example.com" autoComplete="email" onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" value={password} placeholder="At least 6 characters" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} /></label><div className="auth-actions"><button type="button" disabled={authLoading || !email || password.length < 6} onClick={() => void signInEmail(false)}>Sign in</button><button className="secondary" type="button" disabled={authLoading || !email || password.length < 6} onClick={() => void signInEmail(true)}>Create account</button></div>{authError && <p className="run-error" role="alert">{authError}</p>}</section></div>}
    <section className="hero"><p className="eyebrow">Evidence, not just answers</p><h1>Watch a research agent<br /><em>earn its conclusions.</em></h1><p className="lede">Plans, dynamically discovers MCP tools, evaluates sources, and preserves the path from each claim to its evidence.</p></section>
    <section className="workspace-picker"><label htmlFor="workspace">Research workspace</label><select id="workspace" value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}><option value="">Unfiled session</option>{workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select><button type="button" onClick={createNewWorkspace}>New workspace</button></section>
    {workspaceId && <section className="run-picker"><label htmlFor="saved-run">Saved research</label><select id="saved-run" value={session?.id || ""} onChange={(event) => void openWorkspaceRun(event.target.value)}><option value="">Choose a previous research run</option>{workspaceRuns.map((run) => <option value={run.id} key={run.id}>{run.question.slice(0, 72)}{run.question.length > 72 ? "…" : ""}</option>)}</select><small>{workspaceRuns.length ? `${workspaceRuns.length} saved run${workspaceRuns.length === 1 ? "" : "s"} in this workspace` : "New research in this workspace will be saved here."}</small></section>}
    {workspaceId && <nav className="workspace-tabs" aria-label="Workspace tools"><button type="button" className={activeTab === "research" ? "active" : ""} onClick={() => setActiveTab("research")}>Research</button><button type="button" className={activeTab === "paper" ? "active" : ""} onClick={() => setActiveTab("paper")}>Paper</button></nav>}
    {error && <p className="run-error" role="alert">{error}</p>}
    {activeTab === "research" && <section className="question"><label htmlFor="question">Research question</label><textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} /><button onClick={run} disabled={running || !user}>{running ? "Running bounded research…" : user ? "Run research →" : "Sign in to run research"}</button><small>Read-only tools run automatically. Mutating and paid tools stop for approval.</small></section>}
    {activeTab === "paper" && workspaceId && workspaceRuns.length > 0 && <section className="paper-run-selector"><div><p className="eyebrow">Paper sources</p><strong>Select the research runs to include</strong></div><div className="paper-run-options">{workspaceRuns.map((run) => <label key={run.id}><input type="checkbox" checked={selectedPaperRunIds.includes(run.id)} onChange={(event) => setSelectedPaperRunIds((current) => event.target.checked ? [...current, run.id] : current.filter((id) => id !== run.id))} />{run.question}</label>)}</div></section>}
    {activeTab === "paper" && workspaceId && <section className="paper-setup"><div className="paper-setup-title"><p className="eyebrow">Paper setup</p><h2>Format a cited paper</h2></div><div className="profile-row"><select aria-label="Saved writing profile" defaultValue="" onChange={(event) => applyWritingProfile(event.target.value)}><option value="">Apply a saved writing profile</option>{writingProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><input value={profileName} placeholder="Profile name (e.g. Biology 101)" onChange={(event) => setProfileName(event.target.value)} /><button type="button" onClick={() => void saveWritingProfile()}>Save profile</button></div><div className="paper-fields"><label>Paper title<input value={paperTitle} onChange={(event) => setPaperTitle(event.target.value)} /></label><label>Document type<select value={paperType} onChange={(event) => setPaperType(event.target.value as "research-paper" | "essay")}><option value="research-paper">Research paper</option><option value="essay">Essay</option></select></label><label>Citation style<select value={citationStyle} onChange={(event) => setCitationStyle(event.target.value as CitationStyle)}><option value="APA">APA</option><option value="MLA">MLA</option></select></label><label>Target words<input type="number" min="250" max="10000" step="50" value={targetWordCount} onChange={(event) => setTargetWordCount(Number(event.target.value))} /></label><label>Sources to use<select value={sourceLimit} onChange={(event) => setSourceLimit(Number(event.target.value))}><option value={3}>Top 3 sources</option><option value={5}>Top 5 sources</option><option value={8}>Top 8 sources</option><option value={12}>Top 12 sources</option></select></label><label>Your name<input value={paperMetadata.authorName} onChange={(event) => setPaperMetadata((current) => ({ ...current, authorName: event.target.value }))} /></label><label>Course / class<input value={paperMetadata.courseName} onChange={(event) => setPaperMetadata((current) => ({ ...current, courseName: event.target.value }))} /></label><label>Professor / instructor<input value={paperMetadata.instructorName} onChange={(event) => setPaperMetadata((current) => ({ ...current, instructorName: event.target.value }))} /></label></div>{selectedPaperRunIds.length > 0 && <div className="paper-setup-actions"><small>{selectedPaperRunIds.length} selected run{selectedPaperRunIds.length === 1 ? "" : "s"} will be represented before top-ranked sources fill the remaining limit.</small><button type="button" onClick={draftPaper} disabled={paperWriting}>{paperWriting ? "Drafting paper…" : "Generate paper"}</button></div>}</section>}
    {(running || paperWriting) && <div className="live-overlay" role="dialog" aria-modal="true" aria-labelledby="live-agent-title"><section className="live-run" aria-live="polite"><div className="section-title"><p className="eyebrow" id="live-agent-title">{paperWriting ? "Drafting cited paper" : "Live agent activity"}</p><span>{paperWriting ? Math.min(96, paperProgress.at(-1)?.progress || 4) : Math.min(92, 8 + liveTrace.length * 11)}%</span></div><div className="progress"><i style={{ width: `${paperWriting ? Math.min(96, paperProgress.at(-1)?.progress || 4) : Math.min(92, 8 + liveTrace.length * 11)}%` }} /></div><p className="stream-note">{paperWriting ? `${citationStyle} · ${targetWordCount.toLocaleString()} word target` : "Showing the newest five events. Scroll up to inspect earlier activity."}</p><div className="stream-list" ref={streamListRef} onScroll={updateFollowMode}>{paperWriting ? paperProgress.map((item, index) => <div className="trace-item complete" key={`${item.progress}-${index}`}><i>✓</i><strong>{item.text}</strong></div>) : liveTrace.length ? liveTrace.map((item) => <div className={`trace-item ${item.status}`} key={item.id}><i>{kindIcon[item.kind]}</i><strong>{item.message}</strong></div>) : <p className="waiting">Connecting to research runtime…</p>}</div></section></div>}
    {activeTab === "research" && !session && !running && <section className="empty"><span>01 — Plan</span><span>02 — Gather</span><span>03 — Evaluate</span><span>04 — Synthesize</span></section>}
    {activeTab === "research" && session && <section className="workspace">
      <aside className="trace"><div className="section-title"><p className="eyebrow">Live execution trace</p><span className="complete">{session.status}</span></div>{session.trace.map((item) => <div className={`trace-item ${item.status}`} key={item.id}><i>{kindIcon[item.kind]}</i><div><strong>{item.message}</strong>{item.detail && <p>{item.detail}</p>}</div></div>)}<div className="budget">{session.budget.toolCallsUsed}/{session.budget.maxToolCalls} tool calls · {session.budget.iterationsUsed}/{session.budget.maxIterations} iterations · {session.budget.elapsedMs}ms</div></aside>
      <article className="report"><p className="eyebrow">Research report</p><h2>{session.question}</h2><p className="summary">{session.report.summary}</p><div className="claims">{session.report.claims.map((claim) => { const linked = session.evidence.filter((item) => claim.evidenceIds.includes(item.id)); return <button className="claim" onClick={() => setSelectedEvidence(linked)} key={claim.id}><span className={`confidence ${claim.confidence}`}>{claim.confidence} confidence</span><span>{claim.text}</span><b>{linked.length} evidence {linked.length === 1 ? "link" : "links"} →</b></button>; })}</div><div className="limits"><strong>Research limitations</strong>{session.report.limitations.map((item) => <p key={item}>{item}</p>)}</div></article>
      <Provenance evidence={selectedEvidence.length ? selectedEvidence : session.evidence} />
    </section>}
    {activeTab === "paper" && paper && <section className="paper-preview"><div><p className="eyebrow">Workspace paper · {paper.citationStyle} · {paper.targetWordCount.toLocaleString()} word target</p><h2>{paper.title}</h2><div className="paper-downloads"><button onClick={() => navigator.clipboard.writeText(paper.contentMarkdown)}>Copy</button><button onClick={() => void downloadPaper("docx")}>Download DOCX</button><button onClick={() => void downloadPaper("pdf")}>Download PDF</button><button onClick={() => void downloadPaper("markdown")}>Markdown</button></div></div><article className={`paper-content ${paper.citationStyle.toLowerCase()} ${paper.paperMetadata.paperType || "research-paper"}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{paper.contentMarkdown}</ReactMarkdown></article></section>}
  </div>;
}
