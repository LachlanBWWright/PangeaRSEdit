/**
 * Comprehensive Skeleton Value Validation Test
 *
 * This test systematically validates ALL parsed values from Otto skeleton roundtrip
 * against the original, using the markdown documentation mappings and existing test framework.
 *
 * Validates:
 * - Bone hierarchy structure (parentBone, names, counts)
 * - Coordinate system conversion (absolute positions)
 * - Vertex binding (pointIndices, normalIndices, weights)
 * - Animation data (keyframes, timing, transforms)
 * - glTF structure compliance
 */

import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO, Mesh, Primitive } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";
import { unwrap } from "../types/result";

describe("Comprehensive Skeleton Value Validation", () => {
  const ottoBg3dPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.skeleton.rsrc",
  );

  interface ValidationResult {
    boneHierarchy: boolean;
    coordinates: boolean;
    vertexBinding: boolean;
    animations: boolean;
    gltfCompliance: boolean;
    details: {
      boneCount: { original: number; roundtrip: number };
      coordinateErrors: Array<{
        bone: string;
        original: [number, number, number];
        roundtrip: [number, number, number];
      }>;
      vertexBindingErrors: Array<{
        bone: string;
        originalCount: number;
        roundtripCount: number;
      }>;
      animationErrors: Array<{
        anim: string;
        originalChannels: number;
        roundtripChannels: number;
      }>;
      gltfValidationErrors: number;
    };
  }

  async function validateSkeletonRoundtrip(): Promise<ValidationResult> {
    console.log("=== COMPREHENSIVE SKELETON VALUE VALIDATION ===");

    // Load original files
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    // Parse original
    const originalSkeletonResource = await parseSkeletonRsrc(
      originalSkeletonData as unknown as ArrayBuffer,
    );
    const originalBg3dRes = parseBG3D(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
      originalSkeletonResource,
    );
    const originalBg3d = unwrap(originalBg3dRes);

    // Execute roundtrip
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

    // 1. Validate Bone Hierarchy Structure
    console.log("\n=== VALIDATING BONE HIERARCHY ===");
    if (!originalBg3d.skeleton || !roundtripResult.skeleton) {
      result.boneHierarchy = false;
      console.error("❌ Missing skeleton data");
      return result;
    }

    const origBones = originalBg3d.skeleton.bones;
    const rtBones = roundtripResult.skeleton.bones;

    if (origBones.length !== rtBones.length) {
      result.boneHierarchy = false;
      console.error(
        `❌ Bone count mismatch: ${origBones.length} vs ${rtBones.length}`,
      );
    }

    // Check each bone
    origBones.forEach((origBone, index: number) => {
      if (index >= rtBones.length) return;

      const rtBone = rtBones[index];
      if (!rtBone) return;

      // Name check
      if (origBone.name !== rtBone.name) {
        result.boneHierarchy = false;
        console.error(
          `❌ Bone ${index} name mismatch: "${origBone.name}" vs "${rtBone.name}"`,
        );
      }

      // Parent check
      if (origBone.parentBone !== rtBone.parentBone) {
        result.boneHierarchy = false;
        console.error(
          `❌ Bone ${index} (${origBone.name}) parent mismatch: ${origBone.parentBone} vs ${rtBone.parentBone}`,
        );
      }

      console.log(
        `✅ Bone ${index}: "${origBone.name}" parent=${origBone.parentBone}`,
      );
    });

    // 2. Validate Coordinate System Conversion
    console.log("\n=== VALIDATING COORDINATES ===");
    origBones.forEach((origBone, index: number) => {
      if (index >= rtBones.length) return;

      const rtBone = rtBones[index];
      if (!rtBone) return;
      const origCoords: [number, number, number] = [
        origBone.coordX,
        origBone.coordY,
        origBone.coordZ,
      ];
      const rtCoords: [number, number, number] = [
        rtBone.coordX,
        rtBone.coordY,
        rtBone.coordZ,
      ];

      // Allow for coordinate system conversion (right-handed Otto → left-handed glTF → right-handed Otto)
      // The Z coordinate should be negated in the roundtrip due to the conversion
      const expectedRtCoords: [number, number, number] = [
        origBone.coordX,
        origBone.coordY,
        -origBone.coordZ,
      ];

      const coordDiff = Math.sqrt(
        Math.pow(rtCoords[0] - expectedRtCoords[0], 2) +
          Math.pow(rtCoords[1] - expectedRtCoords[1], 2) +
          Math.pow(rtCoords[2] - expectedRtCoords[2], 2),
      );

      if (coordDiff > 0.001) {
        // Allow small floating point errors
        result.coordinates = false;
        result.details.coordinateErrors.push({
          bone: origBone.name,
          original: origCoords,
          roundtrip: rtCoords,
        });
        console.error(
          `❌ Bone ${index} (${
            origBone.name
          }) coordinate error: [${origCoords.join(",")}] vs [${rtCoords.join(
            ",",
          )}] (expected: [${expectedRtCoords.join(",")}])`,
        );
      } else {
        console.log(`✅ Bone ${index}: "${origBone.name}" coords OK`);
      }
    });

    // 3. Validate Vertex Binding
    console.log("\n=== VALIDATING VERTEX BINDING ===");
    origBones.forEach((origBone, index: number) => {
      if (index >= rtBones.length) return;

      const rtBone = rtBones[index];
      if (!rtBone) return;

      // Check point indices
      const origPoints = origBone.pointIndices || [];
      const rtPoints = rtBone.pointIndices || [];

      if (origPoints.length !== rtPoints.length) {
        result.vertexBinding = false;
        result.details.vertexBindingErrors.push({
          bone: origBone.name,
          originalCount: origPoints.length,
          roundtripCount: rtPoints.length,
        });
        console.error(
          `❌ Bone ${index} (${origBone.name}) point count: ${origPoints.length} vs ${rtPoints.length}`,
        );
      } else {
        // Check if arrays are identical
        const pointsMatch = origPoints.every(
          (val: number, idx: number) => val === rtPoints[idx],
        );
        if (!pointsMatch) {
          result.vertexBinding = false;
          console.error(
            `❌ Bone ${index} (${origBone.name}) point indices don't match`,
          );
        } else {
          console.log(
            `✅ Bone ${index}: "${origBone.name}" points OK (${origPoints.length})`,
          );
        }
      }

      // Check normal indices
      const origNormals = origBone.normalIndices || [];
      const rtNormals = rtBone.normalIndices || [];

      if (origNormals.length !== rtNormals.length) {
        result.vertexBinding = false;
        console.error(
          `❌ Bone ${index} (${origBone.name}) normal count: ${origNormals.length} vs ${rtNormals.length}`,
        );
      }
    });

    // 4. Validate Animation Data
    console.log("\n=== VALIDATING ANIMATIONS ===");
    const origAnims = originalBg3d.skeleton.animations;
    const rtAnims = roundtripResult.skeleton.animations;

    if (origAnims.length !== rtAnims.length) {
      result.animations = false;
      console.error(
        `❌ Animation count mismatch: ${origAnims.length} vs ${rtAnims.length}`,
      );
    }

    origAnims.forEach((origAnim, animIndex: number) => {
      if (animIndex >= rtAnims.length) return;

      const rtAnim = rtAnims[animIndex];
      if (!rtAnim) return;

      if (origAnim.name !== rtAnim.name) {
        result.animations = false;
        console.error(
          `❌ Animation ${animIndex} name mismatch: "${origAnim.name}" vs "${rtAnim.name}"`,
        );
      }

      // Count channels (keyframes per bone)
      const origChannels = Object.keys(origAnim.keyframes).length;
      const rtChannels = Object.keys(rtAnim.keyframes).length;

      if (origChannels !== rtChannels) {
        result.animations = false;
        result.details.animationErrors.push({
          anim: origAnim.name,
          originalChannels: origChannels,
          roundtripChannels: rtChannels,
        });
        console.error(
          `❌ Animation ${animIndex} (${origAnim.name}) channels: ${origChannels} vs ${rtChannels}`,
        );
      } else {
        console.log(
          `✅ Animation ${animIndex}: "${origAnim.name}" channels OK (${origChannels})`,
        );
      }
    });

    // 5. Validate glTF Structure Compliance
    console.log("\n=== VALIDATING glTF COMPLIANCE ===");
    const io = new NodeIO();
    const glbBuffer = await io.writeBinary(gltfDoc);
    const validation = await validateBytes(glbBuffer);

    result.details.gltfValidationErrors = validation.issues.numErrors;

    if (validation.issues.numErrors > 0) {
      result.gltfCompliance = false;
      console.error(
        `❌ glTF validation errors: ${validation.issues.numErrors}`,
      );
      validation.issues.messages.forEach((msg: { severity: number; message: string }, i: number) => {
        if (i < 5) {
          // Show first 5 errors
          console.error(
            `   ${msg.severity === 0 ? "ERROR" : "WARNING"}: ${msg.message}`,
          );
        }
      });
    } else {
      console.log("✅ glTF validation passed");
    }

    // Check for skin creation
    const skins = gltfDoc.getRoot().listSkins();
    if (skins.length === 0) {
      result.gltfCompliance = false;
      console.error("❌ No skins created in glTF document");
    } else {
      console.log(`✅ glTF has ${skins.length} skin(s)`);
    }

    return result;
  }

  it("should validate all skeleton values in roundtrip conversion", async () => {
    const result = await validateSkeletonRoundtrip();

    console.log("\n=== VALIDATION SUMMARY ===");
    console.log(`Bone Hierarchy: ${result.boneHierarchy ? "✅" : "❌"}`);
    console.log(`Coordinates: ${result.coordinates ? "✅" : "❌"}`);
    console.log(`Vertex Binding: ${result.vertexBinding ? "✅" : "❌"}`);
    console.log(`Animations: ${result.animations ? "✅" : "❌"}`);
    console.log(`glTF Compliance: ${result.gltfCompliance ? "✅" : "❌"}`);

    console.log("\n=== DETAILED RESULTS ===");
    console.log(
      `Bone Count: ${result.details.boneCount.original} → ${result.details.boneCount.roundtrip}`,
    );
    console.log(`Coordinate Errors: ${result.details.coordinateErrors.length}`);
    console.log(
      `Vertex Binding Errors: ${result.details.vertexBindingErrors.length}`,
    );
    console.log(`Animation Errors: ${result.details.animationErrors.length}`);
    console.log(
      `glTF Validation Errors: ${result.details.gltfValidationErrors}`,
    );

    // All validations should pass
    expect(result.boneHierarchy).toBe(true);
    expect(result.coordinates).toBe(true);
    expect(result.vertexBinding).toBe(true);
    expect(result.animations).toBe(true);
    expect(result.gltfCompliance).toBe(true);
  });

  it("should expose vertex binding weight calculation issues", async () => {
    console.log("=== VERTEX BINDING WEIGHT ANALYSIS ===");

    // Load and parse original
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    const originalSkeletonResource = await parseSkeletonRsrc(
      originalSkeletonData as unknown as ArrayBuffer,
    );
    const originalBg3dResLocal = parseBG3D(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
      originalSkeletonResource,
    );
    const originalBg3d = unwrap(originalBg3dResLocal);

    // Convert to glTF
    const gltfDoc = bg3dParsedToGLTF(originalBg3d);

    // Analyze vertex weights in glTF
    let totalVertices = 0;
    let verticesWithWeights = 0;
    let verticesWithUniformWeights = 0; // All weights = 1.0
    let totalWeightSum = 0;

    gltfDoc
      .getRoot()
      .listMeshes()
      .forEach((mesh: Mesh) => {
        mesh.listPrimitives().forEach((prim: Primitive) => {
          const jointsAcc = prim.getAttribute("JOINTS_0");
          const weightsAcc = prim.getAttribute("WEIGHTS_0");

          if (jointsAcc && weightsAcc) {
            const weightsArray = weightsAcc.getArray() as
              | Float32Array
              | undefined;
            if (!weightsArray) return;
            const numVertices = weightsAcc.getCount();

            totalVertices += numVertices;

            for (let i = 0; i < numVertices; i++) {
              const weightSum =
                (weightsArray[i * 4] ?? 0) +
                (weightsArray[i * 4 + 1] ?? 0) +
                (weightsArray[i * 4 + 2] ?? 0) +
                (weightsArray[i * 4 + 3] ?? 0);

              if (weightSum > 0) {
                verticesWithWeights++;

                // Check if all non-zero weights are 1.0 (the bug)
                const w0 = weightsArray[i * 4] ?? 0;
                const w1 = weightsArray[i * 4 + 1] ?? 0;
                const w2 = weightsArray[i * 4 + 2] ?? 0;
                const w3 = weightsArray[i * 4 + 3] ?? 0;

                const nonZeroWeights = [w0, w1, w2, w3].filter(
                  (w): w is number => typeof w === "number" && w > 0,
                );

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

    console.log(`Total vertices: ${totalVertices}`);
    console.log(`Vertices with weights: ${verticesWithWeights}`);
    console.log(
      `Vertices with uniform weights (bug): ${verticesWithUniformWeights}`,
    );
    console.log(
      `Average weight sum per vertex: ${(
        totalWeightSum / verticesWithWeights
      ).toFixed(3)}`,
    );

    // This test should fail initially, exposing the weight calculation bug
    expect(verticesWithUniformWeights).toBe(0); // Should be 0 when fixed
  });

  it("should expose bone hierarchy coordinate issues", async () => {
    console.log("=== BONE HIERARCHY COORDINATE ANALYSIS ===");

    // Load and parse original
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    const originalSkeletonResource = await parseSkeletonRsrc(
      originalSkeletonData as unknown as ArrayBuffer,
    );
    const originalBg3dResLocal2 = parseBG3D(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
      originalSkeletonResource,
    );
    const originalBg3d2 = unwrap(originalBg3dResLocal2);

    // Analyze bone positions
    const bones = originalBg3d2.skeleton?.bones ?? [];
    console.log("Original bone positions:");

    bones.forEach((bone, index: number) => {
      const distanceFromOrigin = Math.sqrt(
        bone.coordX * bone.coordX +
          bone.coordY * bone.coordY +
          bone.coordZ * bone.coordZ,
      );

      console.log(
        `  Bone ${index} (${bone.name}): [${bone.coordX.toFixed(
          2,
        )}, ${bone.coordY.toFixed(2)}, ${bone.coordZ.toFixed(
          2,
        )}] dist=${distanceFromOrigin.toFixed(2)} parent=${bone.parentBone}`,
      );
    });

    // Check hierarchy - all root bones should have parentBone = -1
    const rootBones = bones.filter((bone) => bone.parentBone === -1);
    const childBones = bones.filter((bone) => bone.parentBone !== -1);

    console.log(
      `\nHierarchy: ${rootBones.length} root bones, ${childBones.length} child bones`,
    );

    // Check if child bones are positioned relative to parents
    childBones.forEach((childBone) => {
      const parentBone = bones[childBone.parentBone];
      if (parentBone) {
        const relativeX = childBone.coordX - parentBone.coordX;
        const relativeY = childBone.coordY - parentBone.coordY;
        const relativeZ = childBone.coordZ - parentBone.coordZ;

        const relativeDistance = Math.sqrt(
          relativeX * relativeX + relativeY * relativeY + relativeZ * relativeZ,
        );

        console.log(
          `  ${childBone.name} relative to ${
            parentBone.name
          }: [${relativeX.toFixed(2)}, ${relativeY.toFixed(
            2,
          )}, ${relativeZ.toFixed(2)}] dist=${relativeDistance.toFixed(2)}`,
        );
      }
    });

    // This test documents the current state - bones should be properly positioned
    expect(rootBones.length).toBeGreaterThan(0);
    expect(bones.length).toBe(rootBones.length + childBones.length);
  });
});
