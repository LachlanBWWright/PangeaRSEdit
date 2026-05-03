import { readFileSync } from "fs";
import {
  NodeIO,
  type Document,
  type Mesh,
  type Primitive,
} from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";
import { parseBG3D, type BG3DParseResult } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";

export interface ValidationResult {
  boneHierarchy: boolean;
  coordinates: boolean;
  vertexBinding: boolean;
  animations: boolean;
  gltfCompliance: boolean;
  details: {
    boneCount: { original: number; roundtrip: number };
    coordinateErrors: {
      bone: string;
      original: [number, number, number];
      roundtrip: [number, number, number];
    }[];
    vertexBindingErrors: {
      bone: string;
      originalCount: number;
      roundtripCount: number;
    }[];
    animationErrors: {
      anim: string;
      originalChannels: number;
      roundtripChannels: number;
    }[];
    gltfValidationErrors: number;
  };
}

export async function loadOriginalOttoBg3d(
  ottoBg3dPath: string,
  ottoSkeletonPath: string,
): Promise<{ ok: true; bg3d: BG3DParseResult } | { ok: false }> {
  const originalBg3dData = readFileSync(ottoBg3dPath);
  const originalSkeletonData = readFileSync(ottoSkeletonPath);

  const skeletonBuffer = originalSkeletonData.buffer.slice(
    originalSkeletonData.byteOffset,
    originalSkeletonData.byteOffset + originalSkeletonData.byteLength,
  );
  const originalSkeletonResource = await parseSkeletonRsrc(skeletonBuffer);

  const bg3dBuffer = originalBg3dData.buffer.slice(
    originalBg3dData.byteOffset,
    originalBg3dData.byteOffset + originalBg3dData.byteLength,
  );
  const originalBg3dRes = parseBG3D(bg3dBuffer, originalSkeletonResource);

  if (!originalBg3dRes.isOk()) {
    return { ok: false };
  }

  return { ok: true, bg3d: originalBg3dRes.value };
}

export async function validateSkeletonRoundtripData(
  ottoBg3dPath: string,
  ottoSkeletonPath: string,
): Promise<ValidationResult> {
  console.log("=== COMPREHENSIVE SKELETON VALUE VALIDATION ===");

  const loaded = await loadOriginalOttoBg3d(ottoBg3dPath, ottoSkeletonPath);
  if (!loaded.ok) {
    return {
      boneHierarchy: false,
      coordinates: false,
      vertexBinding: false,
      animations: false,
      gltfCompliance: false,
      details: {
        boneCount: { original: 0, roundtrip: 0 },
        coordinateErrors: [],
        vertexBindingErrors: [],
        animationErrors: [],
        gltfValidationErrors: 0,
      },
    };
  }

  const originalBg3d = loaded.bg3d;
  const gltfDoc = bg3dParsedToGLTF(originalBg3d);
  const roundtripResult = await gltfToBG3D(gltfDoc);

  const result: ValidationResult = {
    boneHierarchy: true,
    coordinates: true,
    vertexBinding: true,
    animations: true,
    gltfCompliance: true,
    details: {
      boneCount: {
        original: originalBg3d.skeleton?.bones.length || 0,
        roundtrip: roundtripResult.skeleton?.bones.length || 0,
      },
      coordinateErrors: [],
      vertexBindingErrors: [],
      animationErrors: [],
      gltfValidationErrors: 0,
    },
  };

  if (!originalBg3d.skeleton || !roundtripResult.skeleton) {
    result.boneHierarchy = false;
    console.error("Missing skeleton data");
    return result;
  }

  const origBones = originalBg3d.skeleton.bones;
  const rtBones = roundtripResult.skeleton.bones;

  if (origBones.length !== rtBones.length) {
    result.boneHierarchy = false;
  }

  origBones.forEach((origBone, index: number) => {
    const rtBone = rtBones[index];
    if (!rtBone) return;

    if (
      origBone.name !== rtBone.name ||
      origBone.parentBone !== rtBone.parentBone
    ) {
      result.boneHierarchy = false;
    }

    const expectedRtCoords: [number, number, number] = [
      origBone.coordX,
      origBone.coordY,
      -origBone.coordZ,
    ];
    const rtCoords: [number, number, number] = [
      rtBone.coordX,
      rtBone.coordY,
      rtBone.coordZ,
    ];

    const coordDiff = Math.sqrt(
      Math.pow(rtCoords[0] - expectedRtCoords[0], 2) +
        Math.pow(rtCoords[1] - expectedRtCoords[1], 2) +
        Math.pow(rtCoords[2] - expectedRtCoords[2], 2),
    );
    if (coordDiff > 0.001) {
      result.coordinates = false;
      result.details.coordinateErrors.push({
        bone: origBone.name,
        original: [origBone.coordX, origBone.coordY, origBone.coordZ],
        roundtrip: rtCoords,
      });
    }

    const origPoints = origBone.pointIndices || [];
    const rtPoints = rtBone.pointIndices || [];
    if (origPoints.length !== rtPoints.length) {
      result.vertexBinding = false;
      result.details.vertexBindingErrors.push({
        bone: origBone.name,
        originalCount: origPoints.length,
        roundtripCount: rtPoints.length,
      });
    } else {
      const pointsMatch = origPoints.every(
        (val: number, idx: number) => val === rtPoints[idx],
      );
      if (!pointsMatch) result.vertexBinding = false;
    }

    const origNormals = origBone.normalIndices || [];
    const rtNormals = rtBone.normalIndices || [];
    if (origNormals.length !== rtNormals.length) {
      result.vertexBinding = false;
    }
  });

  const origAnims = originalBg3d.skeleton.animations;
  const rtAnims = roundtripResult.skeleton.animations;
  if (origAnims.length !== rtAnims.length) {
    result.animations = false;
  }

  origAnims.forEach((origAnim, animIndex: number) => {
    const rtAnim = rtAnims[animIndex];
    if (!rtAnim) return;

    if (origAnim.name !== rtAnim.name) result.animations = false;

    const origChannels = Object.keys(origAnim.keyframes).length;
    const rtChannels = Object.keys(rtAnim.keyframes).length;
    if (origChannels !== rtChannels) {
      result.animations = false;
      result.details.animationErrors.push({
        anim: origAnim.name,
        originalChannels: origChannels,
        roundtripChannels: rtChannels,
      });
    }
  });

  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(gltfDoc);
  const validation = await validateBytes(glbBuffer);
  result.details.gltfValidationErrors = validation.issues.numErrors;

  if (validation.issues.numErrors > 0) {
    result.gltfCompliance = false;
  }

  if (gltfDoc.getRoot().listSkins().length === 0) {
    result.gltfCompliance = false;
  }

  return result;
}

export function analyzeVertexWeights(gltfDoc: Document): {
  totalVertices: number;
  verticesWithWeights: number;
  verticesWithUniformWeights: number;
  totalWeightSum: number;
} {
  let totalVertices = 0;
  let verticesWithWeights = 0;
  let verticesWithUniformWeights = 0;
  let totalWeightSum = 0;

  gltfDoc
    .getRoot()
    .listMeshes()
    .forEach((mesh: Mesh) => {
      mesh.listPrimitives().forEach((prim: Primitive) => {
        const jointsAcc = prim.getAttribute("JOINTS_0");
        const weightsAcc = prim.getAttribute("WEIGHTS_0");

        if (jointsAcc && weightsAcc) {
          const weightsArrayRaw = weightsAcc.getArray();
          const weightsArray =
            weightsArrayRaw instanceof Float32Array ? weightsArrayRaw : null;
          if (!weightsArray) return;
          const numVertices = weightsAcc.getCount();

          totalVertices += numVertices;
          for (let i = 0; i < numVertices; i++) {
            const w0 = weightsArray[i * 4] ?? 0;
            const w1 = weightsArray[i * 4 + 1] ?? 0;
            const w2 = weightsArray[i * 4 + 2] ?? 0;
            const w3 = weightsArray[i * 4 + 3] ?? 0;
            const weightSum = w0 + w1 + w2 + w3;

            if (weightSum > 0) {
              verticesWithWeights++;
              const nonZeroWeights = [w0, w1, w2, w3].filter((w) => w > 0);
              const allWeightsOne = nonZeroWeights.every(
                (w: number) => Math.abs(w - 1.0) < 0.001,
              );
              if (allWeightsOne && nonZeroWeights.length > 1) {
                verticesWithUniformWeights++;
              }
              totalWeightSum += weightSum;
            }
          }
        }
      });
    });

  return {
    totalVertices,
    verticesWithWeights,
    verticesWithUniformWeights,
    totalWeightSum,
  };
}

export function analyzeBoneHierarchy(bg3d: BG3DParseResult): {
  rootCount: number;
  childCount: number;
  totalCount: number;
} {
  if (!bg3d.skeleton) {
    return { rootCount: 0, childCount: 0, totalCount: 0 };
  }
  const bones = bg3d.skeleton.bones;
  const rootBones = bones.filter((bone) => bone.parentBone === -1);
  const childBones = bones.filter((bone) => bone.parentBone !== -1);

  bones.forEach((bone, index: number) => {
    const distanceFromOrigin = Math.sqrt(
      bone.coordX * bone.coordX +
        bone.coordY * bone.coordY +
        bone.coordZ * bone.coordZ,
    );
    console.log(
      `Bone ${index} (${bone.name}): [${bone.coordX.toFixed(2)}, ${bone.coordY.toFixed(2)}, ${bone.coordZ.toFixed(2)}] dist=${distanceFromOrigin.toFixed(2)} parent=${bone.parentBone}`,
    );
  });

  childBones.forEach((childBone) => {
    const parentBone = bones[childBone.parentBone];
    if (!parentBone) return;

    const relativeX = childBone.coordX - parentBone.coordX;
    const relativeY = childBone.coordY - parentBone.coordY;
    const relativeZ = childBone.coordZ - parentBone.coordZ;
    const relativeDistance = Math.sqrt(
      relativeX * relativeX + relativeY * relativeY + relativeZ * relativeZ,
    );

    console.log(
      `${childBone.name} relative to ${parentBone.name}: [${relativeX.toFixed(2)}, ${relativeY.toFixed(2)}, ${relativeZ.toFixed(2)}] dist=${relativeDistance.toFixed(2)}`,
    );
  });

  return {
    rootCount: rootBones.length,
    childCount: childBones.length,
    totalCount: bones.length,
  };
}
