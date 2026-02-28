/**
 * Skeleton Direct Binary Roundtrip Tests
 *
 * Tests that skeleton .rsrc files can be parsed and re-serialized.
 * For games that use BG3D format (ottomatic, cromagrally), this should
 * produce byte-perfect results. For older 3DMF games (nanosaur1),
 * some skeletons may have empty resource sections that the serializer
 * cannot handle.
 */
import { describe, it, expect } from "vitest";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const gamesRoot = join(__dirname, "../../public/games");

describe("Skeleton direct binary roundtrip", () => {
  const skelFiles = [
    { game: "ottomatic", name: "Otto" },
    { game: "ottomatic", name: "Blob" },
    { game: "cromagrally", name: "Viking" },
    { game: "bugdom1", name: "Ant" },
  ];

  skelFiles.forEach(({ game, name }) => {
    const skelPath = join(gamesRoot, game, "skeletons", `${name}.skeleton.rsrc`);

    it(`${game}/${name}: parse → export → reparse preserves structure`, async () => {
      if (!existsSync(skelPath)) return;

      const originalBuffer = bufferFromFile(skelPath);
      const parsed = await parseSkeletonRsrc(originalBuffer);

      const result = await skeletonResourceToBinary(parsed);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Re-parse the exported binary
      const reparsed = await parseSkeletonRsrc(result.value);

      // Verify bone count matches
      const origBoneCount = Object.keys(parsed.Bone || {}).length;
      const rtBoneCount = Object.keys(reparsed.Bone || {}).length;
      expect(rtBoneCount).toBe(origBoneCount);

      // Verify animation count matches
      const origAnimCount = Object.keys(parsed.AnHd || {}).length;
      const rtAnimCount = Object.keys(reparsed.AnHd || {}).length;
      expect(rtAnimCount).toBe(origAnimCount);
    });
  });
});
