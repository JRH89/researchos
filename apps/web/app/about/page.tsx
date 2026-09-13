import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = { title: "About", description: "ResearchOS is an evidence-first workspace for traceable research and cited academic writing.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return <PublicInfoPage eyebrow="About ResearchOS" title="Research you can explain and defend." lede="ResearchOS was built around a simple idea: useful research should show its work." image="/images/pages/about-hero.png">
    <section className="info-intro"><p className="eyebrow">Evidence, not just answers</p><h2>Make the chain visible.</h2><p>Research agents can move quickly. The work still needs to be reviewable. ResearchOS keeps the links between your question, the sources found, the tools used, and the writing produced.</p></section>
    <section className="info-grid"><article><b>Question</b><h3>Start with intent</h3><p>Every workspace begins with the question you are actually trying to answer.</p></article><article><b>Evidence</b><h3>Inspect the basis</h3><p>Review the excerpts and sources behind a result before you rely on it.</p></article><article><b>Writing</b><h3>Build on the record</h3><p>Use selected, saved research to draft and revise papers without starting over.</p></article></section>
  </PublicInfoPage>;
}
