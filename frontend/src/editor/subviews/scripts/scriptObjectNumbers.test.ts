import { describe, expect, it } from "vitest";
import { parseObjectNumberDraft } from "./scriptObjectNumbers";

describe("custom object numeric editing", () => {
  it.each(["", "  ", "NaN", "Infinity", "-1", "1001"])("rejects %s instead of silently updating dimensions", (value) => {
    expect(parseObjectNumberDraft(value, 0.01, 1000, false).isErr()).toBe(true);
  });
  it("preserves decimals for dimensions and rejects them for asset indices", () => {
    expect(parseObjectNumberDraft("0.25", 0.01, 1000, false).unwrapOr(null)).toBe(0.25);
    expect(parseObjectNumberDraft("1.5", 0, 32767, true).isErr()).toBe(true);
    expect(parseObjectNumberDraft("0", 0, 32767, true).unwrapOr(null)).toBe(0);
  });
});
