export const blogPosts = [
  {
    slug: "why-evidence-provenance-matters",
    title: "Why evidence provenance matters in AI research",
    description: "A research answer becomes more useful when you can inspect the path from a claim back to the source that supports it.",
    publishedAt: "2026-09-12", updatedAt: "2026-09-12",
    body: [
      "AI can make a research result sound finished long before the underlying work is finished. A sentence may be fluent, specific, and persuasive while still leaving the reader with no way to check where the information came from. For coursework, professional research, and any decision that matters, that is a serious limitation.",
      "Evidence provenance is the record that connects a claim to the evidence supporting it. In a useful research workflow, that record should include the source, the relevant excerpt, when it was retrieved, and the process or tool that surfaced it. The goal is not to add paperwork. It is to make review possible.",
      "That changes how a reader interacts with an answer. Instead of treating a conclusion as a black box, they can ask whether the source is credible, whether the excerpt actually supports the claim, and whether another source offers a different perspective. Those questions are part of research, not an optional final step.",
      "ResearchOS is designed around that connection. Claims remain linked to evidence records, and evidence records remain linked to the source and tool call that produced them. When a research run has a gap, the trace helps show whether more searching, a different source, or a narrower question is needed.",
      "Provenance also makes writing more responsible. A cited essay or research paper can be drafted from evidence that has already been selected and reviewed, rather than from an isolated request to generate text. The writer still decides what the evidence means, but they begin with a record they can inspect.",
      "No system can replace source evaluation or a writer's judgment. Provenance simply makes those responsibilities easier to carry out. It gives the researcher a path back to the underlying material and gives the finished work a stronger foundation."
    ]
  },
  {
    slug: "from-saved-runs-to-a-cited-paper",
    title: "From saved runs to a cited paper",
    description: "Selected research runs, source choices, and citation settings stay connected while you draft and revise a paper.",
    publishedAt: "2026-09-11", updatedAt: "2026-09-12",
    body: [
      "Most substantial assignments do not begin and end in one sitting. A student may start with a broad question, discover that one part needs more attention, and return later with a clearer direction. Treating each research pass as disposable forces the writer to reconstruct context when it is time to draft.",
      "Saved research runs solve that problem by keeping a question, its evidence, and its trace together inside a workspace. A paper can draw from one run or several related runs, which is useful when an assignment asks for both background and a focused argument.",
      "Selection matters at the source level as well. A writer should be able to choose which saved runs and which individual sources belong in a paper. That keeps the final references intentional and avoids turning every source found during exploration into a citation.",
      "Formatting settings should travel with the work. Citation style, course information, instructor name, target length, and document type can be saved in a writing profile. That removes repetitive setup while still letting the writer change the requirements when a new assignment calls for it.",
      "Drafting is not the end of the process. A 1,000-word rough draft may need to become a 3,000-word final draft after the writer performs extended research or receives feedback. The useful behavior is to create a new revision that preserves the earlier draft, keeps the central argument coherent, and incorporates newly selected evidence.",
      "That is the workflow ResearchOS supports: saved runs become selected evidence, selected evidence becomes a cited draft, and a draft can become a new saved revision. The original work remains available, so progress is visible instead of overwritten."
    ]
  },
  {
    slug: "research-is-a-process-not-one-prompt",
    title: "Research is a process, not one prompt",
    description: "Planning, gathering, evaluating, and synthesizing create a more reviewable research workflow than a single chat response.",
    publishedAt: "2026-08-28", updatedAt: "2026-09-12",
    body: [
      "A single prompt can be useful for brainstorming, but it is a weak model for research. A meaningful question often contains several smaller questions: what happened, why it happened, what evidence supports competing explanations, and what important information is still missing.",
      "The first step is planning. Breaking a broad question into focused objectives makes the research task more deliberate. It also gives the researcher a way to judge coverage later. If an objective has no reliable evidence, that gap should be visible rather than hidden by a smooth summary.",
      "Next comes gathering. Tools can search connected sources and retrieve relevant material, but tool output must be treated as input to evaluate, not as a fact to repeat. Each useful result should be checked for relevance, provenance, and enough context to support a claim.",
      "Evaluation is where research becomes more than collection. Evidence can support a claim strongly, weakly, or not at all. Sources can conflict. A responsible report records limitations and avoids suggesting certainty that the evidence does not justify.",
      "Synthesis comes after that work. It is the act of connecting supported evidence into an explanation, comparison, or argument. Good synthesis stays close enough to the sources that the reader can review it, while still helping the reader understand what the evidence means together.",
      "Writing is the final stage of this process. When a paper is drafted from planned objectives, selected evidence, and an inspectable trace, the result is easier to defend, revise, and learn from than a generic response produced in one step."
    ]
  }
] as const;

export const blogPost = (slug: string) => blogPosts.find((post) => post.slug === slug);
