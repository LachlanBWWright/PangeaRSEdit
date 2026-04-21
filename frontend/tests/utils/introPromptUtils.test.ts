import { describe, expect, it } from "vitest";
import { prepareDownloadData } from "@/editor/utils/introPromptUtils";
import { createBlankLevel } from "@/data/levelTemplates";
import { combineLevelData } from "@/data/utils/levelDataUtils";
import { OttoGlobals } from "@/data/globals/globals";

function deepFreeze(value: unknown): void {
  if (typeof value !== "object" || value === null) {
    return;
  }
  if (Object.isFrozen(value)) {
    return;
  }
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return;
  }
  for (const item of Object.values(value)) {
    deepFreeze(item);
  }
}

describe("prepareDownloadData", () => {
  it("does not mutate frozen input data during preprocessing", () => {
    const blankResult = createBlankLevel(OttoGlobals.GAME_TYPE, {
      width: 16,
      height: 16,
    });
    if (blankResult.isErr()) {
      expect.fail(String(blankResult.error));
    }
    const blank = blankResult.value;
    const combinedResult = combineLevelData({
      headerData: blank.headerData,
      itemData: blank.itemData,
      liquidData: blank.liquidData,
      fenceData: blank.fenceData,
      splineData: blank.splineData,
      terrainData: blank.terrainData,
    });
    if (combinedResult.isErr()) {
      expect.fail(String(combinedResult.error));
    }
    const mutable = structuredClone(combinedResult.value);
    const items = mutable.Itms?.[1000]?.obj;
    if (!Array.isArray(items)) {
      expect.fail("Expected Itms[1000].obj to be an array");
    }
    items.push({
      x: 2,
      z: 3,
      type: 0,
      flags: 0,
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
    });
    const frozen = structuredClone(mutable);
    deepFreeze(frozen);
    const updated = prepareDownloadData(frozen, OttoGlobals);
    expect(updated).not.toBe(frozen);
    expect(updated.Hedr[1000].obj.numItems).toBe(1);
    expect(frozen.Hedr[1000].obj.numItems).toBe(0);
  });
});
