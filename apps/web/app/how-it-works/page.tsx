import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = { title: "How it works", description: "See how ResearchOS plans, sources, evaluates, and writes from traceable evidence.", alternates: { canonical: "/how-it-works" } };

export default function HowItWorksPage() {
  return <PublicInfoPage eyebrow="How it works" title="Research is a process, not one prompt." lede="ResearchOS keeps the process structured from the first question through a saved, cited paper." image="/images/pages/how-it-works-hero.png">
    <section className="info-intro"><p className="eyebrow">A transparent workflow</p><h2>Move forward with context intact.</h2></section>
    <ol className="info-steps"><li><b>01</b><div><h3>Frame the question</h3><p>Set a focused question and create a workspace where the research can be saved.</p></div></li><li><b>02</b><div><h3>Gather source evidence</h3><p>ResearchOS plans objectives, discovers available tools, and collects source material within a bounded run.</p></div></li><li><b>03</b><div><h3>Evaluate the result</h3><p>Inspect the trace and evidence records before deciding what you want to use.</p></div></li><li><b>04</b><div><h3>Draft and revise</h3><p>Select research runs and sources, choose your format, and preserve each paper revision for later work.</p></div></li></ol>
  </PublicInfoPage>;
}
