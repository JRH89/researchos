"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-site-chrome";

type DemoStep = "welcome" | "ready" | "researching" | "research-complete" | "paper" | "writing" | "complete";

const sources = [
  { title: "National Park Service: Causes of the Civil War", publisher: "National Park Service", excerpt: "The conflict grew from intertwined disputes over slavery, federal authority, and the nation’s economic future.", selected: true },
  { title: "American Civil War", publisher: "Encyclopaedia Britannica", excerpt: "Political division over slavery intensified as the United States expanded westward.", selected: true },
  { title: "The Civil War", publisher: "Library of Congress", excerpt: "Primary-source collections document how political conflict became armed conflict in 1861.", selected: true }
];

const trace = [
  ["01", "Plan", "Framing research objectives and scope."],
  ["02", "Gather", "Finding authoritative historical sources."],
  ["03", "Evaluate", "Checking relevance, provenance, and agreement."],
  ["04", "Synthesize", "Building a cited answer from selected evidence."]
] as const;

const paperParagraphs = [
  [
      "The American Civil War did not result from one disagreement. It developed from years of conflict over slavery, political power, and the expansion of the United States. By 1861, these issues had become almost impossible to separate. Debates about slavery shaped elections, economic policy, and the relationship between the North and South. Although Americans tried to compromise several times, each compromise left the main question unresolved: would slavery continue to expand into new territories?"
  ],
  [
      "Slavery was the central cause of the war because it affected nearly every major political dispute. Conflict grew as the nation expanded westward and leaders had to decide whether slavery would be allowed in new territories (National Park Service). Southern politicians defended slavery as necessary to their economy and way of life. Many Northerners opposed its expansion, even when they disagreed about how quickly slavery should end. Every potential new state could change the balance of power in Congress, so neither side treated the issue as a small regional question."
  ],
  [
      "The North and South also developed different economies and social systems. The South relied heavily on agriculture supported by enslaved labor, while the North had more manufacturing, wage labor, and growing cities (Encyclopaedia Britannica). These differences did not automatically cause a war, but they made Americans see national policy in different ways. Southerners feared that a federal government led by antislavery politicians would eventually interfere with slavery. Northerners worried that slaveholding interests had too much influence over the country’s political future."
  ],
  [
      "Public debate and elections turned these differences into a national crisis, as contemporary Civil War collections make clear (Library of Congress). When Abraham Lincoln won the election of 1860, many Southern leaders believed their influence was threatened because Lincoln opposed the expansion of slavery. Several Southern states chose secession rather than remaining in the Union. That decision created another major conflict: whether a state had the right to leave the United States. When fighting began at Fort Sumter in 1861, political disagreements had become a war over preserving the Union and determining the future of slavery."
  ],
  [
      "The Civil War came from the interaction of slavery, territorial expansion, economic differences, and competing ideas about political power. No single law or election caused the conflict by itself. Instead, each crisis made the next compromise more difficult. Looking at these three sources together shows that slavery remained at the center of the conflict, while arguments about states’ rights and federal authority became the way each side defended its interests. By 1861, those tensions had made war possible."
  ]
];

export function InteractiveDemo() {
  const [step, setStep] = useState<DemoStep>("welcome");
  const [traceCount, setTraceCount] = useState(0);
  const [selectedSources, setSelectedSources] = useState(() => sources.map((source) => source.selected));
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (["welcome", "research-complete", "paper", "complete"].includes(step)) setShowGuide(true);
  }, [step]);

  useEffect(() => {
    if (step !== "researching") return;
    setTraceCount(0);
    const timers = trace.map((_, index) => window.setTimeout(() => setTraceCount(index + 1), 650 + index * 900));
    const complete = window.setTimeout(() => setStep("research-complete"), 4650);
    return () => { timers.forEach(window.clearTimeout); window.clearTimeout(complete); };
  }, [step]);

  useEffect(() => {
    if (step !== "writing") return;
    const complete = window.setTimeout(() => setStep("complete"), 3200);
    return () => window.clearTimeout(complete);
  }, [step]);

  const progress = useMemo(() => {
    if (step === "researching") return Math.min(92, traceCount * 23);
    if (["research-complete", "paper", "writing", "complete"].includes(step)) return 100;
    return 0;
  }, [step, traceCount]);

  const toggleSource = (index: number) => setSelectedSources((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));
  const reset = () => { setStep("welcome"); setTraceCount(0); setSelectedSources(sources.map((source) => source.selected)); setShowGuide(true); };
  const readyForPaper = selectedSources.some(Boolean);
  const guide = step === "research-complete"
    ? { number: "Step 2 of 3", title: "Choose the evidence to carry forward.", copy: "Review the prepared source records, then click <b>Use selected sources</b> to move into the paper workflow." }
    : step === "paper"
      ? { number: "Step 3 of 3", title: "Generate the prepared MLA essay.", copy: "The selected evidence is already connected to this draft. Click <b>Generate paper</b> to finish the simulation." }
      : step === "complete"
        ? { number: "Demo complete", title: "That is the full research-to-paper flow.", copy: "In the live product, this is where you can edit, save, expand, or download the paper." }
        : { number: "Step 1 of 3", title: "Start with the research question.", copy: "Click <b>Run research</b> to watch the prepared workflow plan, gather, and evaluate evidence." };

  return <main className="site-page demo-page">
    <PublicSiteHeader />
    <section className="demo-intro">
      <div><p className="eyebrow">Interactive product tour</p><h1>See the work<br /><em>behind the answer.</em></h1><p>This is a guided simulation with a fixed research question and predetermined source records. Nothing is saved and no credits are used.</p></div>
      <button className="demo-reset" type="button" onClick={reset}>Restart demo</button>
    </section>

    <section className="demo-workspace" aria-label="ResearchOS interactive demo">
      <div className="demo-workspace-top"><div><span className="demo-dot" />Demo workspace</div><span>Guided sample</span></div>
      <div className="demo-tabs" role="tablist" aria-label="Demo mode"><button className={step === "paper" || step === "writing" || step === "complete" ? "" : "active"} type="button" onClick={() => (step === "research-complete" || step === "paper" || step === "complete") && setStep("research-complete")}>Research</button><button className={step === "paper" || step === "writing" || step === "complete" ? "active" : ""} type="button" disabled={!(["paper", "writing", "complete"] as DemoStep[]).includes(step)} onClick={() => setStep("paper")}>Paper</button></div>

      {step !== "paper" && step !== "writing" && step !== "complete" && <section className="demo-question">
        <label htmlFor="demo-question">Research question</label>
        <div id="demo-question">What were the main causes of the American Civil War?</div>
        <small>Read-only tools run automatically. This demo uses prepared evidence.</small>
        <button type="button" disabled={step === "researching"} onClick={() => { setShowGuide(false); setStep("researching"); }}>{step === "researching" ? "Researching…" : step === "research-complete" ? "Research complete" : "Run research →"}</button>
      </section>}

      {step === "researching" && <section className="demo-running" aria-live="polite"><div className="demo-running-heading"><div><p className="eyebrow">Research in progress</p><h2>Following the evidence trail</h2></div><strong>{progress}%</strong></div><div className="demo-progress"><i style={{ width: `${progress}%` }} /></div><div className="demo-trace-list">{trace.slice(0, traceCount).map(([number, title, detail]) => <div key={number}><b>{number}</b><span><strong>{title}</strong><small>{detail}</small></span><em>Done</em></div>)}{traceCount < trace.length && <p>Preparing the next step…</p>}</div></section>}

      {step === "research-complete" && <section className="demo-results"><div className="demo-results-heading"><div><p className="eyebrow">Research complete</p><h2>A concise, traceable answer</h2></div><button type="button" onClick={() => { setShowGuide(false); setStep("paper"); }}>Continue to paper →</button></div><p className="demo-summary">The Civil War resulted from the escalating political conflict over slavery, the balance of state and federal authority, and economic differences between regions. Expansion into western territories made compromise increasingly difficult.</p><div className="demo-claims"><span>Claim 01 <b>High confidence</b></span><span>Claim 02 <b>High confidence</b></span><span>Claim 03 <b>Medium confidence</b></span></div><div className="demo-source-list"><h3>Select sources for the paper</h3>{sources.map((source, index) => <label key={source.title}><input type="checkbox" checked={selectedSources[index]} onChange={() => toggleSource(index)} /><span><strong>{source.title}</strong><small>{source.publisher}</small><p>“{source.excerpt}”</p></span></label>)}</div><button className="demo-paper-cta" type="button" disabled={!readyForPaper} onClick={() => { setShowGuide(false); setStep("paper"); }}>Use {selectedSources.filter(Boolean).length} selected sources to write a paper →</button></section>}

      {(step === "paper" || step === "writing" || step === "complete") && <section className="demo-paper"><div className="demo-paper-settings"><div><p className="eyebrow">Paper setup</p><h2>From evidence to draft</h2><p>Configured from the selected source records in this simulation.</p></div><dl><div><dt>Format</dt><dd>MLA</dd></div><div><dt>Target</dt><dd>500 words</dd></div><div><dt>Sources</dt><dd>{selectedSources.filter(Boolean).length} selected</dd></div></dl></div>{step === "paper" && <button className="demo-generate" type="button" onClick={() => { setShowGuide(false); setStep("writing"); }}>Generate paper →</button>}{step === "writing" && <div className="demo-writing" aria-live="polite"><span className="demo-spinner" />Writing a cited draft from your selected evidence…</div>}{step === "complete" && <article className="demo-paper-result"><div className="demo-mla-heading">Maya Thompson<br />Professor Elena Hall<br />U.S. History 101<br />15 September 2026</div><h2>Causes of the American Civil War</h2>{paperParagraphs.map((paragraphs, index) => <div key={index}>{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>)}<div className="demo-citations"><strong>Works cited</strong>{sources.filter((_, index) => selectedSources[index]).map((source) => <p key={source.title}>{source.publisher}. “{source.title}.”</p>)}</div><div className="demo-paper-actions"><button type="button">Edit draft</button><button type="button">Download PDF</button></div></article>}</section>}
    </section>

    {showGuide && step !== "researching" && step !== "writing" && <aside className="demo-guide" role="dialog" aria-label="Demo tutorial"><button type="button" aria-label="Dismiss tutorial" onClick={() => setShowGuide(false)}>×</button><span>{guide.number}</span><strong>{guide.title}</strong><p dangerouslySetInnerHTML={{ __html: guide.copy }} /></aside>}
    <PublicSiteFooter />
  </main>;
}
