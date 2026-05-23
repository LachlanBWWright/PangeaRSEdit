import { describe, expect, it } from "vitest";
import { Bugdom2Globals } from "../globals/globals";
import { FenceType } from "../fences/bugdom2FenceType";
import { getFenceHeight } from "../fences/getFenceHeight";

describe("getFenceHeight", () => {
  it("uses the Bugdom 2 source heights for the last three fence types", () => {
    expect(getFenceHeight(Bugdom2Globals, FenceType.WATERGRASS)).toBe(1700);
    expect(getFenceHeight(Bugdom2Globals, FenceType.GARBAGECAN)).toBe(1700);
    expect(getFenceHeight(Bugdom2Globals, FenceType.BOXFENCE)).toBe(800);
  });
});
