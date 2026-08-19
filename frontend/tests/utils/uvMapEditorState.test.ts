import { describe, expect, it } from "vitest";
import type { UvLayout, UvMeshLayout } from "@/modelEditing/uv/uvTypes";
import {
  applyScopedLayoutChange,
  getMeshBounds,
  getOverlapRatio,
  getSteppedZoomPercent,
  getWheelZoomPercent,
  replaceVertex,
} from "@/components/TextureManager/uvMapEditorState";

const firstMesh: UvMeshLayout = {
  meshId: "first",
  meshName: "First",
  geometryIndex: 0,
  vertices: [
    { u: 0, v: 0 },
    { u: 0.5, v: 0 },
    { u: 0, v: 0.5 },
  ],
  faces: [{ vertexIndices: [0, 1, 2] }],
};
const secondMesh: UvMeshLayout = {
  ...firstMesh,
  meshId: "second",
  meshName: "Second",
  geometryIndex: 1,
  vertices: firstMesh.vertices.map((vertex) => ({
    u: vertex.u + 0.25,
    v: vertex.v + 0.25,
  })),
};
const layout: UvLayout = {
  textureName: "texture.png",
  meshes: [firstMesh, secondMesh],
};

describe("UV map editor state", () => {
  it("replaces only the requested vertex", () => {
    const result = replaceVertex(layout, "first", 1, { u: 0.8, v: 0.7 });

    expect(result.meshes[0]?.vertices[1]).toEqual({ u: 0.8, v: 0.7 });
    expect(result.meshes[1]).toBe(secondMesh);
  });

  it("scopes bulk edits to the selected mesh", () => {
    const result = applyScopedLayoutChange(
      layout,
      "second",
      true,
      (scopedLayout) => ({
        ...scopedLayout,
        meshes: scopedLayout.meshes.map((mesh) => ({
          ...mesh,
          vertices: mesh.vertices.map(() => ({ u: 1, v: 1 })),
        })),
      }),
    );

    expect(result.meshes[0]).toBe(firstMesh);
    expect(result.meshes[1]?.vertices).toEqual([
      { u: 1, v: 1 },
      { u: 1, v: 1 },
      { u: 1, v: 1 },
    ]);
  });

  it("measures overlap relative to the smaller mesh bounds", () => {
    expect(getOverlapRatio(getMeshBounds(firstMesh), getMeshBounds(secondMesh)))
      .toBe(0.25);
  });

  it("keeps toolbar and wheel zoom within supported bounds", () => {
    expect(getSteppedZoomPercent(100, 1)).toBe(150);
    expect(getSteppedZoomPercent(50, -1)).toBe(50);
    expect(getWheelZoomPercent(800, -1)).toBe(800);
    expect(getWheelZoomPercent(50, 1)).toBe(50);
    expect(getWheelZoomPercent(125, 0)).toBe(125);
  });
});
