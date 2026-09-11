import { describe, expect, it } from "vitest";
import { quotePaper } from "./quote";
describe("paper quote", () => { it("increases credits with requested length", () => expect(quotePaper(3000).credits).toBeGreaterThan(quotePaper(500).credits)); });
