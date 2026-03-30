import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "@/modelParsers/parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { unwrap } from "@/types/result";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function compareBuffers(orig: Uint8Array, reser: Uint8Array, label: string): { match: boolean; diffCount: number } {
  if (orig.length !== reser.length) {
    console.log(`${label}: SIZE MISMATCH: orig=${orig.length} reser=${reser.length} diff=${reser.length - orig.length}`);
    return { match: false, diffCount: -1 };
  }
  let diffCount = 0;
  for (let i = 0; i < orig.length; i++) {
    if (orig[i] !== reser[i]) {
      diffCount++;
      if (diffCount <= 3) {
        console.log(`${label}: Byte diff at 0x${i.toString(16)}: orig=0x${(orig[i] ?? 0).toString(16).padStart(2, '0')} reser=0x${(reser[i] ?? 0).toString(16).padStart(2, '0')}`);
      }
    }
  }
  if (diffCount === 0) {
    console.log(`${label}: BYTE-PERFECT (${orig.length} bytes)`);
  } else {
    console.log(`${label}: ${diffCount} diffs out of ${orig.length} bytes`);
  }
  return { match: diffCount === 0, diffCount };
}

describe("BG3D roundtrip tests", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  
  const testModels = [
    { game: "ottomatic", name: "Blob" },
    { game: "ottomatic", name: "Otto" },
  ];
  
  testModels.forEach(({ game, name }) => {
    const bg3dPath = join(gamesRoot, game, "skeletons", `${name}.bg3d`);
    const skelPath = join(gamesRoot, game, "skeletons", `${name}.skeleton.rsrc`);
    
    it(`${game}/${name}: direct parse → serialize is byte-perfect`, async () => {
      if (!existsSync(bg3dPath)) { console.warn("Skip: not found"); return; }
      const originalBg3d = bufferFromFile(bg3dPath);
      const originalSkel = existsSync(skelPath) ? bufferFromFile(skelPath) : undefined;
      const skelResource = originalSkel ? await parseSkeletonRsrc(originalSkel) : undefined;
      const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
      const reserialized = bg3dParsedToBG3D(parsed);
      const { match } = compareBuffers(new Uint8Array(originalBg3d), new Uint8Array(reserialized), `${game}/${name} direct`);
      expect(match).toBe(true);
    });

    it(`${game}/${name}: GLB roundtrip produces valid same-size BG3D (no extras)`, async () => {
      if (!existsSync(bg3dPath)) { console.warn("Skip: not found"); return; }
      const originalBg3d = bufferFromFile(bg3dPath);
      const originalSkel = existsSync(skelPath) ? bufferFromFile(skelPath) : undefined;
      const skelResource = originalSkel ? await parseSkeletonRsrc(originalSkel) : undefined;
      const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
      
      // Convert to clean GLB (no extras)
      const gltfDoc = bg3dParsedToGLTF(parsed);
      const extras = gltfDoc.getRoot().getExtras();
      expect(!extras || Object.keys(extras).length === 0).toBe(true);
      
      // Write and read GLB
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(gltfDoc);
      const readDoc = await io.readBinary(glbBytes);
      
      // Convert back to BG3D
      const roundtripped = await gltfToBG3D(readDoc);
      const reserialized = bg3dParsedToBG3D(roundtripped);
      
      // Size should match
      console.log(`${game}/${name} GLB roundtrip: orig=${originalBg3d.byteLength} rt=${reserialized.byteLength}`);
      expect(reserialized.byteLength).toBe(originalBg3d.byteLength);
      
      // Verify can be re-parsed
      const reparsed = parseBG3D(reserialized);
      expect(reparsed.ok).toBe(true);
    });
  });
});
