"use client";

import { useState } from "react";

export function PublicSiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="public-header site-header">
    <a className="brand" href="/"><span className="mark">R</span><span>ResearchOS</span></a>
    <button className="mobile-menu" type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((current) => !current)}><i /><i /><i /></button>
    <nav className={open ? "public-nav open" : "public-nav"} aria-label="Site navigation">
      <a href="/#features" onClick={() => setOpen(false)}>Features</a><a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a><a href="/#pricing" onClick={() => setOpen(false)}>Pricing</a><a href="/blog" onClick={() => setOpen(false)}>Blog</a><a href="/#about" onClick={() => setOpen(false)}>About</a><a href="/#faq" onClick={() => setOpen(false)}>FAQ</a><a href="/support" onClick={() => setOpen(false)}>Support</a>
    </nav>
    <div className="header-actions"><a className="site-sign-in" href="/?signin=1">Sign in</a></div>
  </header>;
}

export function PublicSiteFooter() {
  return <footer className="public-footer site-footer">
    <a className="brand" href="/"><span className="mark">R</span><span>ResearchOS</span></a>
    <span>Evidence, not just answers.</span>
    <nav><a href="/#features">Features</a><a href="/#how-it-works">How it works</a><a href="/#pricing">Pricing</a><a href="/blog">Blog</a><a href="/#about">About</a><a href="/#faq">FAQ</a><a href="/privacy">Privacy</a><a href="/support">Support</a><a href="/?signin=1">Sign in</a></nav>
  </footer>;
}
