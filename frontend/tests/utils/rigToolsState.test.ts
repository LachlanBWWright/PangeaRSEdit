import { describe, expect, it } from "vitest";
import {
  collectBoneInfluenceRowsFromSkinData,
  pinSelectedBoneRow,
} from "@/components/AnimationViewer/rigToolsState";
import type { SkinWeightsData } from "@/modelEditing/weights/weightTypes";

describe("rig tools state", () => {
  const data: SkinWeightsData = {
    boneNames: ["root", "arm", "leg"],
    vertices: [
      { vertexIndex: 0, influences: [{ boneIndex: 0, boneName: "root", weight: 0.2 }, { boneIndex: 1, boneName: "arm", weight: 0.8 }] },
      { vertexIndex: 1, influences: [{ boneIndex: 0, boneName: "root", weight: 0.5 }, { boneIndex: 2, boneName: "leg", weight: 0.5 }] },
      { vertexIndex: 2, influences: [{ boneIndex: 1, boneName: "arm", weight: 1 }] },
    ],
  };

  it("aggregates counts and weights and sorts strongest first", () => {
    expect(collectBoneInfluenceRowsFromSkinData(data)).toEqual([
      { boneName: "arm", vertexCount: 2, weightedSum: 1.8 },
      { boneName: "root", vertexCount: 2, weightedSum: 0.7 },
      { boneName: "leg", vertexCount: 1, weightedSum: 0.5 },
    ]);
  });

  it("pins an existing selected bone without changing the remaining order", () => {
    const rows = collectBoneInfluenceRowsFromSkinData(data);
    expect(pinSelectedBoneRow(rows, "leg").map((row) => row.boneName)).toEqual(["leg", "arm", "root"]);
    expect(pinSelectedBoneRow(rows, "")).toBe(rows);
    expect(pinSelectedBoneRow(rows, "missing")).toBe(rows);
  });
});
