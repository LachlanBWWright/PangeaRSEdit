import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute, Group, SkinnedMesh } from "three";
import { applyWeightBrushStroke } from "@/modelEditing/weights/weightBrushStroke";
import type {
  SkinWeightsData,
  WeightBrushSettings,
} from "@/modelEditing/weights/weightTypes";

describe("applyWeightBrushStroke", () => {
  it("edits the nearest vertex when the hit radius contains no vertices", () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3),
    );
    const mesh = new SkinnedMesh(geometry);
    const scene = new Group();
    scene.add(mesh);

    const data: SkinWeightsData = {
      boneNames: ["Root"],
      vertices: [
        { vertexIndex: 0, influences: [] },
        { vertexIndex: 1, influences: [] },
      ],
    };
    const settings: WeightBrushSettings = {
      mode: "paint",
      radius: 0.5,
      strength: 0.75,
      falloff: "smooth",
      targetBone: "Root",
      autoNormalize: false,
    };

    const result = applyWeightBrushStroke(scene, data, settings, {
      meshUuid: mesh.uuid,
      localPoint: [100, 0, 0],
    });

    expect(result.vertices[0]?.influences).toEqual([]);
    expect(result.vertices[1]?.influences).toEqual([
      { boneIndex: 0, boneName: "Root", weight: 0.75 },
    ]);
  });
});
