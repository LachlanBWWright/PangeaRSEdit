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
  it("clones before preprocessing frozen level data", () => {
    const blankResult = createBlankLevel(OttoGlobals.GAME_TYPE, {
      width: 16,
      height: 16,
    });
    if (blankResult.isErr()) {
      throw blankResult.error;
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
      throw combinedResult.error;
    }
    const frozen = structuredClone(combinedResult.value);
    deepFreeze(frozen);
    const updated = prepareDownloadData(frozen, OttoGlobals);
    expect(updated).not.toBe(frozen);
  });
});
