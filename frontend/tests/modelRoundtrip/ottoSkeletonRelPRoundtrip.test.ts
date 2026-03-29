import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "@/modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
import { unwrap } from "@/types/result";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("Otto GLB skeleton RelP roundtrip", () => {
  const gamesRoot = join(__dirname, "../../public/games/ottomatic/skeletons");

  ["Blob", "Otto"].forEach((name) => {
    it(`${name}: reconstructs usable RelP from raw GLB alone`, async () => {
      const bg3dPath = join(gamesRoot, `${name}.bg3d`);
      const skelPath = join(gamesRoot, `${name}.skeleton.rsrc`);
      if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
        return;
      }

      const originalBg3d = bufferFromFile(bg3dPath);
      const originalSkel = bufferFromFile(skelPath);
      const originalResource = await parseSkeletonRsrc(originalSkel);
      const parsed = unwrap(parseBG3D(originalBg3d, originalResource));
      expect(parsed.skeleton?.relPoints?.["1000"]?.length).toBeGreaterThan(0);

      const doc = bg3dParsedToGLTF(parsed);
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(doc);
      const readDoc = await io.readBinary(glbBytes);
      const roundtripped = await gltfToBG3D(readDoc);

      expect(roundtripped.skeleton).toBeDefined();
      expect(roundtripped.skeleton?.relPoints?.["1000"]?.length).toBe(
        parsed.skeleton?.relPoints?.["1000"]?.length,
      );

      const roundtrippedResource = bg3dSkeletonToSkeletonResource(
        roundtripped.skeleton!,
      );
      expect(roundtrippedResource.RelP?.["1000"]?.obj.length).toBe(
        parsed.skeleton?.relPoints?.["1000"]?.length,
      );

      const binaryResult = skeletonResourceToBinary(roundtrippedResource);
      expect(binaryResult.ok).toBe(true);
      if (!binaryResult.ok) {
        return;
      }

      const reparsedResource = await parseSkeletonRsrc(binaryResult.value);
      expect(reparsedResource.RelP?.["1000"]?.obj.length).toBe(
        parsed.skeleton?.relPoints?.["1000"]?.length,
      );
      expect(Object.keys(reparsedResource.Bone || {}).length).toBe(
        Object.keys(originalResource.Bone || {}).length,
      );
    });
  });
});
