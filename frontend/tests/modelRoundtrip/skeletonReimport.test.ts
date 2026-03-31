/**
 * Test: Export skeleton.rsrc binary → re-import → verify it parses successfully
 * This tests the exact user flow: load model+skeleton, export skeleton, re-import
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "@/modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const ottoSkeletons = [
  { name: "Otto", bg3d: "Otto.bg3d", skeleton: "Otto.skeleton.rsrc" },
  { name: "Blob", bg3d: "Blob.bg3d", skeleton: "Blob.skeleton.rsrc" },
];

const bugdom2Skeletons = [
  { name: "Ant", bg3d: "Ant.bg3d", skeleton: "Ant.skeleton.rsrc" },
  { name: "Skip_Explore", bg3d: "Skip_Explore.skeleton.rsrc", skeleton: "Skip_Explore.skeleton.rsrc" },
];

describe("Skeleton export → re-import round-trip", () => {
  for (const model of ottoSkeletons) {
    const bg3dPath = join(__dirname, `../public/games/ottomatic/skeletons/${model.bg3d}`);
    const skelPath = join(__dirname, `../public/games/ottomatic/skeletons/${model.skeleton}`);

    it(`Otto Matic ${model.name}: exported skeleton.rsrc can be re-imported`, async () => {
      if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
        console.log(`Skipping ${model.name}: files not found`);
        return;
      }

      // Step 1: Parse original skeleton
      const skelBuffer = bufferFromFile(skelPath);
      const originalSkeleton = await parseSkeletonRsrc(skelBuffer);
      expect(originalSkeleton.Hedr).toBeDefined();
      expect(Object.keys(originalSkeleton.Bone).length).toBeGreaterThan(0);

      // Step 2: Parse BG3D with skeleton
      const bg3dBuffer = bufferFromFile(bg3dPath);
      const bg3dResult = parseBG3D(bg3dBuffer, originalSkeleton);
      expect(bg3dResult.isOk()).toBe(true);
      if (!bg3dResult.isOk()) return;
      const parsed = bg3dResult.value;
      expect(parsed.skeleton).toBeDefined();
      if (!parsed.skeleton) return;

      // Step 3: Export back to SkeletonResource
      const exported = bg3dSkeletonToSkeletonResource(
        parsed.skeleton,
        undefined,
        undefined,
        undefined,
        parsed.skeleton.metadata,
        model.name,
      );
      expect(exported.Hedr).toBeDefined();
      expect(Object.keys(exported.Bone).length).toBeGreaterThan(0);

      // Step 4: Convert to binary
      const binaryResult = skeletonResourceToBinary(exported);
      expect(binaryResult.isOk()).toBe(true);
      if (!binaryResult.isOk()) {
        console.error("Binary export failed:", binaryResult.error.message);
        return;
      }

      // Step 5: RE-IMPORT the exported binary - THIS IS WHAT THE USER DOES
      const reimportBuffer = binaryResult.value;
      console.log(`${model.name}: Original skeleton size: ${skelBuffer.byteLength}, Exported size: ${reimportBuffer.byteLength}`);
      
      try {
        const reimported = await parseSkeletonRsrc(reimportBuffer);
        expect(reimported.Hedr).toBeDefined();
        expect(Object.keys(reimported.Bone).length).toBe(Object.keys(originalSkeleton.Bone).length);
        console.log(`${model.name}: Re-import successful! Bones: ${Object.keys(reimported.Bone).length}`);
      } catch (error) {
        console.error(`${model.name}: RE-IMPORT FAILED:`, error);
        // Dump the first bytes of the exported binary for debugging
        const firstBytes = new Uint8Array(reimportBuffer.slice(0, 32));
        console.error(`First 32 bytes of exported binary: ${Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        throw error;
      }
    });
  }

  for (const model of bugdom2Skeletons) {
    const skelPath = join(__dirname, `../public/games/bugdom2/skeletons/${model.skeleton}`);

    it(`Bugdom 2 ${model.name}: skeleton can be parsed, exported, and re-imported`, async () => {
      if (!existsSync(skelPath)) {
        console.log(`Skipping ${model.name}: file not found`);
        return;
      }

      // Step 1: Parse original skeleton
      const skelBuffer = bufferFromFile(skelPath);
      const originalSkeleton = await parseSkeletonRsrc(skelBuffer);
      
      // Step 2: Export to binary (direct roundtrip without BG3D) 
      const binaryResult = skeletonResourceToBinary(originalSkeleton);
      expect(binaryResult.isOk()).toBe(true);
      if (!binaryResult.isOk()) {
        console.error("Binary export failed:", binaryResult.error.message);
        return;
      }
      
      // Step 3: Re-import
      const reimportBuffer = binaryResult.value;
      console.log(`${model.name}: Original size: ${skelBuffer.byteLength}, Exported: ${reimportBuffer.byteLength}`);
      
      const reimported = await parseSkeletonRsrc(reimportBuffer);
      expect(reimported.Hedr).toBeDefined();
      console.log(`${model.name}: Re-import successful!`);
    });
  }
});
