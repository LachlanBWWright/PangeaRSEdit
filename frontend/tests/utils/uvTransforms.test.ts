import { describe, expect, it } from "vitest";
import { applyUvTransform, fitUvToImage, snapUvToPixelGrid } from "@/modelEditing/uv/uvTransforms";
import type { UvLayout } from "@/modelEditing/uv/uvTypes";

function layout(vertices: readonly { u: number; v: number }[]): UvLayout {
  return {
    textureName: "texture.png",
    materialName: "material",
    meshes: [{ meshId: "mesh", meshName: "Mesh", geometryIndex: 0, vertices, faces: [] }],
  };
}

describe("UV transforms", () => {
  it("applies translation, nonuniform scaling, rotation, and flips around the mesh pivot", () => {
    const source = layout([{ u: 0, v: 0 }, { u: 2, v: 2 }]);
    const transformed = applyUvTransform({
      layout: source,
      offsetU: 1,
      offsetV: -1,
      rotationDeg: 90,
      scaleU: 2,
      scaleV: 1,
      flipU: true,
      flipV: false,
    });
    expect(transformed.meshes[0]?.vertices[0]?.u).toBeCloseTo(3);
    expect(transformed.meshes[0]?.vertices[0]?.v).toBeCloseTo(2);
    expect(transformed.meshes[0]?.vertices[1]?.u).toBeCloseTo(1);
    expect(transformed.meshes[0]?.vertices[1]?.v).toBeCloseTo(-2);
    expect(source.meshes[0]?.vertices).toEqual([{ u: 0, v: 0 }, { u: 2, v: 2 }]);
  });

  it("uses the default pivot for an empty mesh", () => {
    const source = layout([]);
    expect(applyUvTransform({ layout: source, offsetU: 1, offsetV: 1, rotationDeg: 0, scaleU: 1, scaleV: 1, flipU: false, flipV: false }).meshes[0]?.vertices).toEqual([]);
  });

  it("fits UVs across all meshes into the unit square", () => {
    const source: UvLayout = {
      ...layout([]),
      meshes: [
        { meshId: "a", meshName: "A", geometryIndex: 0, faces: [], vertices: [{ u: -1, v: 2 }, { u: 1, v: 4 }] },
        { meshId: "b", meshName: "B", geometryIndex: 1, faces: [], vertices: [{ u: 3, v: 6 }] },
      ],
    };
    expect(fitUvToImage(source).meshes.map((mesh) => mesh.vertices)).toEqual([
      [{ u: 0, v: 0 }, { u: 0.5, v: 0.5 }],
      [{ u: 1, v: 1 }],
    ]);
  });

  it("returns the original layout for empty or degenerate ranges", () => {
    const empty = layout([]);
    const flat = layout([{ u: 1, v: 0 }, { u: 1, v: 2 }]);
    expect(fitUvToImage(empty)).toBe(empty);
    expect(fitUvToImage(flat)).toBe(flat);
  });

  it("snaps UVs to the nearest texel", () => {
    const snapped = snapUvToPixelGrid(layout([{ u: 0.24, v: 0.76 }]), 4, 8);
    expect(snapped.meshes[0]?.vertices[0]).toEqual({ u: 0.25, v: 0.75 });
  });
});
