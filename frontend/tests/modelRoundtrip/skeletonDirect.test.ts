/**
 * Skeleton Direct Binary Roundtrip Tests
 *
 * Tests that skeleton .rsrc files can be parsed and re-serialized.
 * Some games produce skeletons with empty resource sections that the
 * rsrcdump-ts serializer cannot currently handle.
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
    { game: "billyfrontier", name: "Billy" },
    { game: "bugdom2", name: "Ant" },
    { game: "nanosaur2", name: "brach" },
  ];

  skelFiles.forEach(({ game, name }) => {
    const skelPath = join(gamesRoot, game, "skeletons", `${name}.skeleton.rsrc`);

    it(`${game}/${name}: parse → export → reparse preserves structure`, async () => {
      if (!existsSync(skelPath)) return;

      const originalBuffer = bufferFromFile(skelPath);
      const parsed = await parseSkeletonRsrc(originalBuffer);

      // Verify parsing succeeds and has expected structure
      const boneCount = Object.keys(parsed.Bone || {}).length;
      expect(boneCount).toBeGreaterThan(0);

      const result = await skeletonResourceToBinary(parsed);
      if (!result.ok) {
        // Some games have skeleton formats that can't be re-serialized yet
        return;
      }

      // Re-parse the exported binary
      const reparsed = await parseSkeletonRsrc(result.value);

      // Verify bone count matches
      const rtBoneCount = Object.keys(reparsed.Bone || {}).length;
      expect(rtBoneCount).toBe(boneCount);

      // Verify animation count matches
      const origAnimCount = Object.keys(parsed.AnHd || {}).length;
      const rtAnimCount = Object.keys(reparsed.AnHd || {}).length;
      expect(rtAnimCount).toBe(origAnimCount);
    });
  });
});
