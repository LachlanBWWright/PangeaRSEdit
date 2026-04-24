import { describe, expect, it } from "vitest";
import { join } from "path";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";
import {
  analyzeBoneHierarchy,
  analyzeVertexWeights,
  loadOriginalOttoBg3d,
  validateSkeletonRoundtripData,
} from "./skeletonValueValidationHelpers";

describe("Comprehensive Skeleton Value Validation", () => {
  const ottoBg3dPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.skeleton.rsrc",
  );

  it("should validate all skeleton values in roundtrip conversion", async () => {
    const result = await validateSkeletonRoundtripData(
      ottoBg3dPath,
      ottoSkeletonPath,
    );

    console.log("\n=== VALIDATION SUMMARY ===");
    console.log(`Bone Hierarchy: ${result.boneHierarchy ? "pass" : "fail"}`);
    console.log(`Coordinates: ${result.coordinates ? "pass" : "fail"}`);
    console.log(`Vertex Binding: ${result.vertexBinding ? "pass" : "fail"}`);
    console.log(`Animations: ${result.animations ? "pass" : "fail"}`);
    console.log(`glTF Compliance: ${result.gltfCompliance ? "pass" : "fail"}`);

    expect(result.boneHierarchy).toBe(true);
    expect(result.coordinates).toBe(true);
    expect(result.vertexBinding).toBe(true);
    expect(result.animations).toBe(true);
    expect(result.gltfCompliance).toBe(true);
  });

  it("should expose vertex binding weight calculation issues", async () => {
    console.log("=== VERTEX BINDING WEIGHT ANALYSIS ===");
    const loaded = await loadOriginalOttoBg3d(ottoBg3dPath, ottoSkeletonPath);
    if (!loaded.ok) {
      expect.fail("Expected Otto BG3D and skeleton parsing to succeed");
    }

    const gltfDoc = bg3dParsedToGLTF(loaded.bg3d);
    const stats = analyzeVertexWeights(gltfDoc);

    console.log(`Total vertices: ${stats.totalVertices}`);
    console.log(`Vertices with weights: ${stats.verticesWithWeights}`);
    console.log(
      `Vertices with uniform weights (bug): ${stats.verticesWithUniformWeights}`,
    );
    console.log(
      `Average weight sum per vertex: ${
        stats.verticesWithWeights > 0
          ? (stats.totalWeightSum / stats.verticesWithWeights).toFixed(3)
          : "0.000"
      }`,
    );

    expect(stats.verticesWithUniformWeights).toBe(0);
  });

  it("should expose bone hierarchy coordinate issues", async () => {
    console.log("=== BONE HIERARCHY COORDINATE ANALYSIS ===");
    const loaded = await loadOriginalOttoBg3d(ottoBg3dPath, ottoSkeletonPath);
    if (!loaded.ok) {
      expect.fail("Expected Otto BG3D and skeleton parsing to succeed");
    }

    const summary = analyzeBoneHierarchy(loaded.bg3d);
    console.log(
      `Hierarchy: ${summary.rootCount} root bones, ${summary.childCount} child bones`,
    );

    expect(summary.rootCount).toBeGreaterThan(0);
    expect(summary.totalCount).toBe(summary.rootCount + summary.childCount);
  });
});
