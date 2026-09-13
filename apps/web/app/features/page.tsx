import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = { title: "Features", description: "ResearchOS plans research, preserves evidence provenance, saves work, and drafts cited academic papers.", alternates: { canonical: "/features" } };

export default function FeaturesPage() {
  return <PublicInfoPage eyebrow="ResearchOS features" title="Evidence stays connected to the work." lede="A research workspace that helps you move from a question to a defensible, cited result without losing the path in between." image="/images/pages/features-hero.png">
    <section className="info-intro"><p className="eyebrow">Built for a clearer process</p><h2>Every stage has a record.</h2><p>ResearchOS gives you an inspectable process, not an opaque answer. Save the work, review the evidence, and return to it when your assignment grows.</p></section>
    <section className="info-grid"><article><b>01</b><h3>Bounded research runs</h3><p>Turn a question into focused objectives, source discovery, evaluation, and synthesis with visible trace steps.</p></article><article><b>02</b><h3>Source provenance</h3><p>Keep claims connected to evidence records, source excerpts, tool calls, and the research trace that produced them.</p></article><article><b>03</b><h3>Cited writing</h3><p>Select the research runs and sources to use, then draft APA or MLA papers from the evidence you chose.</p></article><article><b>04</b><h3>Saved revisions</h3><p>Keep papers, profiles, sessions, and workspaces together so a rough draft can become a stronger final draft.</p></article></section>
  </PublicInfoPage>;
}
