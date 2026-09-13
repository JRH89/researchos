"use client";

import { useState } from "react";

type SiteHeaderProps = { signedIn?: boolean; credits?: number | null; onSignIn?: () => void; onBilling?: () => void; onSignOut?: () => void };

export function SiteHeader({ signedIn = false, credits, onSignIn, onBilling, onSignOut }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <><header className="app-header"><div className="app-header-inner">
    <a className="brand" href="/"><span className="mark">R</span><span>ResearchOS</span></a>
    <button className="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((current) => !current)}><i /><i /><i /></button>
    <nav className={`${open ? "public-nav open" : "public-nav"}${signedIn ? " signed-nav" : ""}`} aria-label="Site navigation">
      {!signedIn && <><a href="/about" onClick={close}>About</a><a href="/features" onClick={close}>Features</a><a href="/how-it-works" onClick={close}>How it works</a><a href="/pricing" onClick={close}>Pricing</a><a href="/faq" onClick={close}>FAQ</a><a href="/blog" onClick={close}>Blog</a><a href="/support" onClick={close}>Support</a></>}
      {signedIn && <div className="mobile-auth-actions"><a href="/" onClick={close}>Research desk</a><a href="/account" onClick={close}>Account</a><a href="/support" onClick={close}>Support</a>{onBilling && <button type="button" onClick={onBilling}>{credits === null || credits === undefined ? "Credits" : `${credits.toLocaleString()} credits`} +</button>}{onSignOut && <button type="button" onClick={onSignOut}>Sign out</button>}</div>}
    </nav>
    <div className="header-actions app-header-actions">{signedIn ? <><a href="/">Research desk</a><a href="/account">Account</a><a href="/support">Support</a>{onBilling && <button className="credit-control" type="button" onClick={onBilling}><span>{credits === null || credits === undefined ? "Credits" : `${credits.toLocaleString()} credits`}</span><b aria-hidden="true">+</b></button>}{onSignOut && <button type="button" onClick={onSignOut}>Sign out</button>}</> : onSignIn ? <button type="button" onClick={onSignIn}>Sign in</button> : <a className="site-sign-in" href="/?signin=1">Sign in</a>}</div>
  </div></header><div className="app-header-spacer" aria-hidden="true" /></>;
}

export function PublicSiteHeader() { return <SiteHeader />; }

export function PublicSiteFooter() {
  return <footer className="public-footer site-footer">
    <a className="brand" href="/"><span className="mark">R</span><span>ResearchOS</span></a>
    <span>Evidence, not just answers.</span>
    <nav><a href="/about">About</a><a href="/features">Features</a><a href="/how-it-works">How it works</a><a href="/pricing">Pricing</a><a href="/faq">FAQ</a><a href="/blog">Blog</a><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/?signin=1">Sign in</a></nav>
  </footer>;
}
