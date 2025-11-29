import { describe, it, expect } from "vitest";
import { Document } from "@gltf-transform/core";

import { BG3DSkeleton, BG3DBone } from "../../parseBG3D";
import { bg3dBonesToGltf } from "./bones";
import { bg3dSkinningToGltf, gltfSkinningToBg3d } from "./skinning";

describe("skinning roundtrip", () => {
  it("assigns vertices to bones based on JOINTS_0/WEIGHTS_0", () => {
    // Prepare a minimal BG3D skeleton with two bones
    const parsedSkeleton: BG3DSkeleton = {
      version: 272,
      numAnims: 0,
      numJoints: 2,
      num3DMFLimbs: 0,
      bones: [
        {
          parentBone: -1,
          name: "root",
          coordX: 0,
          coordY: 0,
          coordZ: 0,
          numPointsAttachedToBone: 0,
          numNormalsAttachedToBone: 0,
          pointIndices: [],
          normalIndices: [],
        },
        {
          parentBone: 0,
          name: "child",
          coordX: 1,
          coordY: 0,
          coordZ: 0,
          numPointsAttachedToBone: 0,
          numNormalsAttachedToBone: 0,
          pointIndices: [],
          normalIndices: [],
        },
      ],
      animations: [],
    };

    const doc = new Document();
    const baseBuffer = doc.createBuffer();

    // Create joints from bones
    const { joints } = bg3dBonesToGltf(parsedSkeleton, doc);

    // Create skin using bg3dSkinningToGltf (will create inverse bind matrices)
    const skin = bg3dSkinningToGltf(parsedSkeleton, joints, doc, baseBuffer);
    expect(skin).not.toBeNull();

    // Create a mesh with 2 vertices. Vertex 0 influenced by bone 0, vertex 1 by bone 1
    const mesh = doc.createMesh();
    const prim = doc.createPrimitive();

    const positions = new Float32Array([0, 0, 0, 1, 0, 0]); // two vertices
    const posAcc = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(positions)
      .setBuffer(baseBuffer);

    // JOINTS_0: VEC4 per-vertex, using uint16
    const jointsData = new Uint16Array([0, 0, 0, 0, 1, 0, 0, 0]);
    const jointsAcc = doc
      .createAccessor()
      .setType("VEC4")
      .setArray(jointsData)
      .setBuffer(baseBuffer);

    // WEIGHTS_0: VEC4 per-vertex
    const weightsData = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0]);
    const weightsAcc = doc
      .createAccessor()
      .setType("VEC4")
      .setArray(weightsData)
      .setBuffer(baseBuffer);

    prim.setAttribute("POSITION", posAcc);
    prim.setAttribute("JOINTS_0", jointsAcc);
    prim.setAttribute("WEIGHTS_0", weightsAcc);

    mesh.addPrimitive(prim);

    // Now extract skinning info back into BG3D bones
    gltfSkinningToBg3d(parsedSkeleton.bones, doc);

    // After extraction, each bone should have one point assigned
    expect(parsedSkeleton.bones[0].numPointsAttachedToBone).toBe(1);
    expect(parsedSkeleton.bones[1].numPointsAttachedToBone).toBe(1);

    // Verify the point indices match the global vertex indices (0 and 1)
    expect(parsedSkeleton.bones[0].pointIndices).toEqual([0]);
    expect(parsedSkeleton.bones[1].pointIndices).toEqual([1]);
  });
});
