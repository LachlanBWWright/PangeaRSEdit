import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("3DMF + skeleton bone-vertex binding", () => {
  it("populates pointIndices from BonP for 3DMF models", async () => {
    const modelPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.bg3d",
    );
    const skelPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
    );

    if (!existsSync(modelPath) || !existsSync(skelPath)) {
      console.warn("Skipping - Otto files not found");
      return;
    }

    const skeleton = await parseSkeletonRsrc(bufferFromFile(skelPath));

    // Verify the skeleton resource has BonP data
    const bonPKeys = Object.keys(skeleton.BonP);
    expect(bonPKeys.length).toBeGreaterThan(0);

    // Count total point indices across all BonP entries
    let totalBonPPoints = 0;
    for (const entry of Object.values(skeleton.BonP)) {
      totalBonPPoints += entry.obj.length;
    }
    expect(totalBonPPoints).toBeGreaterThan(0);

    // Parse with skeleton
    const result = parseBG3DWithSkeletonResource(
      bufferFromFile(modelPath),
      skeleton,
    );
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const parsed = result.value;
    expect(parsed.skeleton).toBeDefined();
    if (!parsed.skeleton) return;

    // Verify bones have pointIndices populated
    let totalPointIndices = 0;
    for (const bone of parsed.skeleton.bones) {
      if (bone.pointIndices) {
        totalPointIndices += bone.pointIndices.length;
      }
    }

    // The skeleton bones should have point indices from BonP
    expect(totalPointIndices).toBe(totalBonPPoints);
    expect(totalPointIndices).toBeGreaterThan(0);

    // Verify at least some bones have non-empty pointIndices
    const bonesWithPoints = parsed.skeleton.bones.filter(
      (b) => b.pointIndices && b.pointIndices.length > 0,
    );
    expect(bonesWithPoints.length).toBeGreaterThan(0);
  });
});
