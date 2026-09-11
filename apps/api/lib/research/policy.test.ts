import { describe, expect, it } from "vitest";
import { decideToolExecution } from "./policy";

const base = { name: "search", description: "search", server: "test", transport: {}, estimatedCostUsd: 0 };
describe("tool execution policy", () => {
  it("allows read-only work within budget", () => expect(decideToolExecution({ ...base, readOnly: true }, 0, 1)).toEqual({ allowed: true }));
  it("requires approval for mutating work", () => expect(decideToolExecution({ ...base, readOnly: false }, 0, 1)).toMatchObject({ allowed: false }));
  it("blocks an over-budget tool", () => expect(decideToolExecution({ ...base, readOnly: true, estimatedCostUsd: 2 }, 0, 1)).toMatchObject({ allowed: false }));
});
