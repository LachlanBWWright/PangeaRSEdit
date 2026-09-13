import { describe, expect, it } from "vitest";
import { Group, Vector3 } from "three";
import { applyModelPartLocalTransform } from "./itemModelPresentation";
import type { UniversalItemModelMapping } from "@/data/items/itemModelTypes";

describe("item model part presentation", () => {
  it("applies source-local offsets exactly once under the parent mapping scale", () => {
    const mapping: UniversalItemModelMapping = {
      modelFile: "level1_farm.bg3d",
      modelPath: "models",
      modelIndex: 23,
      scale: 4,
    };
    const part: NonNullable<UniversalItemModelMapping["modelParts"]>[number] = {
      partId: "propeller",
      modelFile: "level1_farm.bg3d",
      modelPath: "models",
      modelIndex: 24,
      positionOffset: [0, 372, 53],
      citations: [],
    };
    const renderedPart = new Group();
    applyModelPartLocalTransform(renderedPart, part, mapping);

    const preview = new Group();
    preview.scale.setScalar(4);
    preview.add(renderedPart);
    preview.updateMatrixWorld(true);

    expect(renderedPart.getWorldPosition(new Vector3()).toArray()).toEqual([0, 1488, 212]);
  });
});
