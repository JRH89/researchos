import { describe, expect, it } from "vitest";
import { runResearch } from "./engine";

describe("research engine", () => {
  it("produces traceable, evidence-backed claims within execution limits", async () => {
    process.env.RESEARCHOS_DEMO_MODE = "true";
    const streamed = [] as string[];
    const result = await runResearch("test question", { onTrace: (trace) => streamed.push(trace.id) });
    expect(result.status).toBe("complete");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.report.claims.every((claim) => claim.evidenceIds.length > 0)).toBe(true);
    expect(result.trace.some((entry) => entry.kind === "approval" && entry.status === "blocked")).toBe(true);
    expect(result.budget.toolCallsUsed).toBeLessThanOrEqual(result.budget.maxToolCalls);
    expect(streamed).toEqual(result.trace.map((trace) => trace.id));
  });

  it("honors a requested source target within bounded execution limits", async () => {
    process.env.RESEARCHOS_DEMO_MODE = "true";
    const result = await runResearch("test question", { sourceTarget: 7 });
    expect(result.trace[0]?.message).toContain("7 distinct validated sources");
    expect(result.budget.maxToolCalls).toBeGreaterThanOrEqual(7);
    expect(result.budget.maxToolCalls).toBeLessThanOrEqual(12);
  });
});
