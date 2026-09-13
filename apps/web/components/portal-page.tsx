"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, onIdTokenChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseAuth, firebaseConfigured } from "@/lib/auth/firebase-client";
import { PublicSiteFooter, SiteHeader } from "@/components/public-site-chrome";

type Mode = "account" | "support" | "admin";
type Workspace = { id: string; name: string; description: string };
type Profile = { id: string; name: string; citationStyle: string; targetWordCount: number };
type Ticket = { id: string; subject: string; message: string; status: "open" | "in_progress" | "closed"; email: string; createdAt: string };
type LibraryItem = { id: string; title: string; workspaceName: string; createdAt: string };
type Library = { sessions: LibraryItem[]; papers: LibraryItem[] };

const api = (path: string) => {
  const local = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return `${local ? "http://localhost:3001" : process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}${path}`;
};

export function PortalPage({ mode }: { mode: Mode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [library, setLibrary] = useState<Library>({ sessions: [], papers: [] });
  const [balance, setBalance] = useState<{ availableCredits: number; reservedCredits: number } | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [overview, setOverview] = useState<Record<string, number> | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [password, setPassword] = useState("");

  async function request(path: string, init: RequestInit = {}) {
    const call = async (refresh = false) => { const current = firebaseAuth().currentUser; const token = current ? await current.getIdToken(refresh) : ""; return fetch(api(path), { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } }); };
    const response = await call(); return response.status === 401 && firebaseAuth().currentUser ? call(true) : response;
  }
  async function load() {
    if (!firebaseAuth().currentUser) return;
    setError("");
    try {
      if (mode === "account") { const [a, b, c, d] = await Promise.all([request("/api/workspaces"), request("/api/writing-profiles"), request("/api/billing/balance"), request("/api/account/library")]); if (![a, b, c, d].every((response) => response.ok)) throw new Error("Your session could not be loaded. Please sign in again."); setWorkspaces(await a.json()); setProfiles(await b.json()); setBalance(await c.json()); setLibrary(await d.json()); }
      if (mode === "support") { const [ticketsResponse, balanceResponse] = await Promise.all([request("/api/support/tickets"), request("/api/billing/balance")]); if (!ticketsResponse.ok || !balanceResponse.ok) throw new Error("Could not load your support tickets."); setTickets(await ticketsResponse.json()); setBalance(await balanceResponse.json()); }
      if (mode === "admin") { const [a, b] = await Promise.all([request("/api/admin/overview"), request("/api/admin/tickets")]); if (!a.ok || !b.ok) throw new Error("Administrator access is required."); setOverview(await a.json()); setTickets(await b.json()); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load this page."); }
  }
  useEffect(() => { if (!firebaseConfigured) { setError("Firebase is not configured for this deployment."); return; } return onIdTokenChanged(firebaseAuth(), (nextUser) => { setUser(nextUser); if (nextUser?.email) setContactEmail(nextUser.email); if (nextUser) void load(); }); }, [mode]);
  async function signIn() { try { await signInWithPopup(firebaseAuth(), new GoogleAuthProvider()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign-in failed."); } }
  async function signInEmailPassword(createAccount = false) { if (!signInEmail.trim() || !password) { setError("Enter your email address and password."); return; } try { const auth = firebaseAuth(); if (createAccount) await createUserWithEmailAndPassword(auth, signInEmail.trim(), password); else await signInWithEmailAndPassword(auth, signInEmail.trim(), password); } catch (cause) { setError(cause instanceof Error ? cause.message : "Sign-in failed."); } }
  async function leave() { try { await signOut(firebaseAuth()); window.location.assign("/"); } catch { setError("Could not sign out. Please try again."); } }
  async function remove(path: string, label: string) { if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return; try { const response = await request(path, { method: "DELETE" }); if (!response.ok) { setError(`Could not delete this ${label}.`); return; } void load(); } catch { setError("The API could not be reached. Check your connection and try again."); } }
  async function createTicket() { try { const response = await request("/api/support/tickets", { method: "POST", body: JSON.stringify({ email: contactEmail, subject, message }) }); if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; setError(body?.error || "Could not create the ticket."); return; } setSubject(""); setMessage(""); setError("Your ticket was sent. We will reply to the contact email you provided."); if (user) void load(); } catch { setError("The API could not be reached. Check your connection and try again."); } }
  async function updateTicket(id: string, status: Ticket["status"]) { try { const response = await request("/api/admin/tickets", { method: "PATCH", body: JSON.stringify({ id, status }) }); if (!response.ok) { setError("Could not update the ticket."); return; } void load(); } catch { setError("The API could not be reached. Check your connection and try again."); } }

  const title = mode === "account" ? "Your research library." : mode === "support" ? "Support when you need it." : "ResearchOS administration.";
  const usesPublicChrome = mode === "support" && !user;
  return <main className={`portal portal-${mode}`}>
    <SiteHeader signedIn={Boolean(user)} credits={balance?.availableCredits} onBilling={() => window.location.assign("/?billing=1")} onSignOut={() => void leave()} />
    <section className="portal-intro"><p className="eyebrow">{mode === "admin" ? "Administrator" : mode === "support" ? "Help center" : "Account"}</p><h1>{title}</h1><p>{mode === "account" ? "Manage your workspaces, writing profiles, credits, and subscription in one place." : mode === "support" ? "Send a ticket, track its status, and find answers without leaving your research." : "Review platform activity and respond to support tickets."}</p></section>
    {!user && mode !== "support" ? <SignInCard email={signInEmail} password={password} onEmail={setSignInEmail} onPassword={setPassword} onGoogle={signIn} onEmailPassword={signInEmailPassword} error={error} /> : <>
      {error && <p className="run-error">{error}</p>}
      {mode === "account" && <AccountView balance={balance} workspaces={workspaces} profiles={profiles} library={library} onDelete={remove} />}
      {mode === "support" && <>{!user && <SignInCard email={signInEmail} password={password} onEmail={setSignInEmail} onPassword={setPassword} onGoogle={signIn} onEmailPassword={signInEmailPassword} error="" compact />}{!user && <p className="guest-ticket-note">You do not need an account to contact support. Sign in if you want to track tickets here.</p>}<TicketForm contactEmail={contactEmail} subject={subject} message={message} onEmail={setContactEmail} onSubject={setSubject} onMessage={setMessage} onSubmit={createTicket} />{user && <section className="portal-card"><p className="eyebrow">Your tickets</p><h2>Conversation history</h2><TicketList tickets={tickets} /></section>}</>}
      {mode === "admin" && <><section className="account-stats">{Object.entries(overview || {}).map(([label, value]) => <article key={label}><span>{label.replace("_", " ")}</span><strong>{value}</strong></article>)}</section><section className="portal-card"><p className="eyebrow">Support queue</p><h2>Open and recent tickets</h2><TicketList tickets={tickets} admin onStatus={updateTicket} /></section></>}
    </>}
    {usesPublicChrome && <PublicSiteFooter />}
  </main>;
}

function SignInCard({ email, password, onEmail, onPassword, onGoogle, onEmailPassword, error, compact = false }: { email: string; password: string; onEmail: (value: string) => void; onPassword: (value: string) => void; onGoogle: () => Promise<void>; onEmailPassword: (createAccount?: boolean) => Promise<void>; error: string; compact?: boolean }) { return <section className={`portal-card sign-in-card${compact ? " compact" : ""}`}><p className="eyebrow">{compact ? "Already have an account?" : "Account access"}</p><h2>{compact ? "Sign in to track your tickets" : "Sign in to continue"}</h2><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => onEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete={compact ? "current-password" : "current-password"} value={password} onChange={(event) => onPassword(event.target.value)} /></label><div className="sign-in-actions"><button type="button" onClick={() => void onEmailPassword()}>Sign in</button><button type="button" className="secondary" onClick={() => void onEmailPassword(true)}>Create account</button></div><div className="sign-in-divider"><span>or</span></div><button type="button" className="google-button" onClick={() => void onGoogle()}>Continue with Google</button>{error && <p className="run-error">{error}</p>}</section>; }

function TicketForm({ contactEmail, subject, message, onEmail, onSubject, onMessage, onSubmit }: { contactEmail: string; subject: string; message: string; onEmail: (value: string) => void; onSubject: (value: string) => void; onMessage: (value: string) => void; onSubmit: () => Promise<void> }) { return <section className="portal-card ticket-form"><p className="eyebrow">New ticket</p><h2>How can we help?</h2><p className="ticket-form-help">We will use this email address to reply to you.</p><label>Contact email<input type="email" value={contactEmail} onChange={(event) => onEmail(event.target.value)} maxLength={254} autoComplete="email" required /></label><label>Subject<input value={subject} onChange={(event) => onSubject(event.target.value)} maxLength={160} /></label><label>Message<textarea value={message} onChange={(event) => onMessage(event.target.value)} maxLength={5000} /></label><button disabled={!contactEmail.trim() || !subject.trim() || !message.trim()} onClick={() => void onSubmit()}>Send ticket</button></section>; }

function AccountView({ balance, workspaces, profiles, library, onDelete }: { balance: { availableCredits: number; reservedCredits: number } | null; workspaces: Workspace[]; profiles: Profile[]; library: Library; onDelete: (path: string, label: string) => Promise<void> }) {
  return <><section className="account-stats"><article><span>Available credits</span><strong>{balance?.availableCredits ?? "—"}</strong><small>{balance?.reservedCredits || 0} reserved</small></article><article><span>Saved workspaces</span><strong>{workspaces.length}</strong><small>Organize research runs</small></article><article><span>Writing profiles</span><strong>{profiles.length}</strong><small>Reusable paper settings</small></article></section><section className="portal-card"><div className="portal-heading"><div><p className="eyebrow">Research library</p><h2>Sessions and papers</h2></div><a href="/">Open research desk</a></div><LibraryList heading="Saved sessions" items={library.sessions} onDelete={(id) => onDelete(`/api/research/${id}`, "research session")} /><LibraryList heading="Saved papers" items={library.papers} onDelete={(id) => onDelete(`/api/papers/${id}`, "paper")} /></section><section className="portal-card"><div className="portal-heading"><div><p className="eyebrow">Workspaces</p><h2>Saved research</h2></div></div>{workspaces.length ? <div className="manage-list">{workspaces.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{item.description || "Research workspace"}</small></div><button onClick={() => void onDelete(`/api/workspaces/${item.id}`, "workspace")}>Delete</button></article>)}</div> : <p>No workspaces yet. Create one from the research desk to keep work permanently.</p>}</section><section className="portal-card"><div className="portal-heading"><div><p className="eyebrow">Writing profiles</p><h2>Saved paper settings</h2></div></div>{profiles.length ? <div className="manage-list">{profiles.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{item.citationStyle} · {item.targetWordCount.toLocaleString()} words</small></div><button onClick={() => void onDelete(`/api/writing-profiles/${item.id}`, "writing profile")}>Delete</button></article>)}</div> : <p>Save a profile from the Paper tab to reuse course and citation settings.</p>}</section></>;
}
function LibraryList({ heading, items, onDelete }: { heading: string; items: LibraryItem[]; onDelete: (id: string) => void }) { return <div className="library-list"><h3>{heading}</h3>{items.length ? items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.workspaceName} · {new Date(item.createdAt).toLocaleDateString()}</small></div><button onClick={() => onDelete(item.id)}>Delete</button></article>) : <p>Nothing saved yet.</p>}</div>; }
function TicketList({ tickets, admin, onStatus }: { tickets: Ticket[]; admin?: boolean; onStatus?: (id: string, status: Ticket["status"]) => void }) { return tickets.length ? <div className="ticket-list">{tickets.map((ticket) => <article key={ticket.id}><div><span className={`ticket-status ${ticket.status}`}>{ticket.status.replace("_", " ")}</span><strong>{ticket.subject}</strong><p>{ticket.message}</p><small>{admin && ticket.email ? `${ticket.email} · ` : ""}{new Date(ticket.createdAt).toLocaleDateString()}</small></div>{admin && <select value={ticket.status} onChange={(event) => onStatus?.(ticket.id, event.target.value as Ticket["status"])}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select>}</article>)}</div> : <p>No tickets yet.</p>; }
