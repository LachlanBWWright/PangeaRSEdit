import { describe, it, expect } from "vitest";
import { bg3dParsedToGLTF } from "./BG3DParsedToGIFT";
import { gltfToBG3D } from "./gltfToBG3D";
import { BG3DParseResult, BG3DGeometryFull, BG3DMaterial } from "./parseBG3D";

function makeMinimalBG3D(): BG3DParseResult {
  const material: BG3DMaterial = {
    flags: 0,
    diffuseColor: [1, 0, 0, 1],
    textures: [],
  };
  const geometry: BG3DGeometryFull = {
    type: 0,
    numMaterials: 1,
    numPoints: 3,
    numTriangles: 1,
    layerMaterialNum: [0, 0, 0, 0],
    points: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    triangles: [[0, 1, 2]],
  };
  return {
    materials: [material],
    groups: [],
    geometries: [geometry],
  };
}

describe("bg3dParsedToGLTF", () => {
  it("converts minimal BG3DParseResult to glTF", () => {
    const bg3d = makeMinimalBG3D();
    const gltf = bg3dParsedToGLTF(bg3d);
    expect(gltf.asset.version).toBe("2.0");
    expect(gltf.meshes.length).toBe(1);
    expect(gltf.materials.length).toBe(1);
    expect(gltf.meshes[0].primitives[0].attributes.POSITION).toBeDefined();
    expect(gltf.meshes[0].primitives[0].indices).toBeDefined();
  });

  it("round-trips BG3D -> glTF -> BG3D", () => {
    const bg3d = makeMinimalBG3D();
    const gltf = bg3dParsedToGLTF(bg3d);
    const roundTrip = gltfToBG3D(gltf);
    expect(roundTrip.materials.length).toBe(bg3d.materials.length);
    expect(roundTrip.geometries.length).toBe(bg3d.geometries.length);
    expect(roundTrip.geometries[0].points).toEqual(bg3d.geometries[0].points);
    expect(roundTrip.geometries[0].triangles).toEqual(
      bg3d.geometries[0].triangles,
    );
  });

  it("handles empty geometry", () => {
    const bg3d: BG3DParseResult = { materials: [], groups: [], geometries: [] };
    const gltf = bg3dParsedToGLTF(bg3d);
    expect(gltf.meshes.length).toBe(0);
    expect(gltf.materials.length).toBe(0);
  });
});
