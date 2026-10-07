import { describe, expect, it } from "vitest";
import { getObjectModelBounds } from "./scriptObjectModelBounds";
import { getObjectNativeModelOptions } from "./scriptObjectNativeCatalog";

describe("custom item model dimensions", () => {
  const parsed = { groups: [{ children: [
    { children: [{ vertices: [[-2, -3, -4], [2, 3, 4]] }] },
    { vertices: [[0, 0, 0], [100, 100, 100]] },
  ] }] };
  it("fits only the selected model and applies the visual scale", () => {
    expect(getObjectModelBounds(parsed, 2, 0).unwrapOr(null)).toEqual({ width: 8, height: 12, depth: 16 });
  });
  it("contains off-center geometry in a box centered at the item origin", () => {
    expect(getObjectModelBounds(parsed, 1, 1).unwrapOr(null)).toEqual({ width: 200, height: 200, depth: 200 });
  });
  it("rejects invalid geometry, out-of-range selection, scale, and excessive dimensions", () => {
    expect(getObjectModelBounds({}, 1).isErr()).toBe(true);
    expect(getObjectModelBounds(parsed, 1, 10).isErr()).toBe(true);
    expect(getObjectModelBounds(parsed, -1, 0).isErr()).toBe(true);
    expect(getObjectModelBounds(parsed, 20, 1).isErr()).toBe(true);
  });
});

describe("named native model choices", () => {
  it.each(["Bugdom-android", "Bugdom2-Android"])("offers real bank/index pairs without duplicate choices for %s", (gameId) => {
    const choices = getObjectNativeModelOptions(gameId);
    expect(choices.length).toBeGreaterThan(0);
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(choices.length);
    expect(choices.every((choice) => choice.index >= 0 && choice.label.length > 0)).toBe(true);
    expect(choices.some((choice) => choice.bank !== "global")).toBe(true);
  });
});
