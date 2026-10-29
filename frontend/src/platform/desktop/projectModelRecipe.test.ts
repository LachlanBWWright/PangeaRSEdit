import { describe, expect, it } from "vitest";
import type { AssetImportRecipe } from "@pangea/desktop-contracts";
import { materialColorChannels, materialColorHex, setAssetAnimationEvents, setMaterialMapping } from "./projectModelRecipe";

const recipe: AssetImportRecipe = { scale: 2, rotation: [0, 90, 0], blenderCollection: "Characters" };

describe("persistent native appearance recipe", () => {
  it("updates one named material without resetting source transforms or other materials", () => {
    const first = setMaterialMapping(recipe, "Body", { clampU: true, diffuseColor: [0.2, 0.4, 0.8, 1] });
    const second = setMaterialMapping(first, "Eyes", { alwaysBlend: true });
    const edited = setMaterialMapping(second, "Body", { clampU: false });
    expect(edited).toEqual({ ...recipe, materialMappings: [
      { material: "Eyes", alwaysBlend: true }, { material: "Body", clampU: false, diffuseColor: [0.2, 0.4, 0.8, 1] },
    ] });
    expect(first.materialMappings?.[0]?.clampU).toBe(true);
  });

  it("removes an override when every property is restored to source", () => {
    const overridden = setMaterialMapping(recipe, "Body", { alwaysBlend: false });
    expect(setMaterialMapping(overridden, "Body", { alwaysBlend: undefined })).toEqual({ ...recipe, materialMappings: [] });
  });

  it("distinguishes intentionally empty clip events from restoring the source", () => {
    const existing = setAssetAnimationEvents(recipe, "Walk", [{ time: 15, type: 3, value: 4 }]);
    const cleared = setAssetAnimationEvents(existing, "Attack", []);
    expect(cleared.animationEvents).toEqual([{ clip: "Walk", events: [{ time: 15, type: 3, value: 4 }] }, { clip: "Attack", events: [] }]);
    expect(setAssetAnimationEvents(cleared, "Attack", undefined).animationEvents).toEqual(existing.animationEvents);
  });

  it("converts a color selection while retaining native opacity", () => {
    expect(materialColorHex([1, 0.5, 0, 0.4])).toBe("#ff8000");
    expect(materialColorChannels("#ff8000", 0.4)).toEqual([1, 128 / 255, 0, 0.4]);
  });
});
