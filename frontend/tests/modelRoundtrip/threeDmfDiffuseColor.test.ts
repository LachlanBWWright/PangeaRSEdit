import { describe, expect, it } from "vitest";
import { metaFileToBG3DParseResult } from "../../src/modelParsers/threeDMF/convert";
import {
  TQ3Boolean,
  TexturingMode,
  type TQ3MetaFile,
  type TQ3TriMeshData,
} from "../../src/modelParsers/threeDMF/types";

function createUntexturedMesh(): TQ3TriMeshData {
  return {
    numTriangles: 1,
    triangles: [{ pointIndices: [0, 1, 2] }],
    numPoints: 3,
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
    vertexNormals: null,
    vertexUVs: null,
    vertexColors: null,
    bBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 0 },
      isEmpty: TQ3Boolean.False,
    },
    texturingMode: TexturingMode.Off,
    internalTextureID: -1,
    hasVertexNormals: false,
    hasVertexColors: false,
    diffuseColor: { r: 0.2, g: 0.6, b: 0.1, a: 1 },
  };
}

describe("3DMF diffuse color conversion", () => {
  it("preserves diffuse colors on untextured meshes", () => {
    const mesh = createUntexturedMesh();
    const metaFile: TQ3MetaFile = {
      numTextures: 0,
      textures: [],
      numMeshes: 1,
      meshes: [mesh],
      numTopLevelGroups: 1,
      topLevelGroups: [
        {
          numMeshes: 1,
          meshes: [mesh],
        },
      ],
    };

    const convertResult = metaFileToBG3DParseResult(metaFile);

    expect(convertResult.isOk()).toBe(true);
    if (!convertResult.isOk()) return;
    expect(convertResult.value.materials[1]?.diffuseColor).toEqual([
      0.2,
      0.6,
      0.1,
      1,
    ]);
    const rootGroup = convertResult.value.groups[0];
    const childGroup = rootGroup?.children[0];
    expect(childGroup).toBeDefined();
    if (!childGroup || !("children" in childGroup)) return;
    const geometry = childGroup.children[0];
    expect(geometry).toBeDefined();
    if (!geometry || !("layerMaterialNum" in geometry)) return;
    expect(geometry.layerMaterialNum[0]).toBe(1);
  });
});
