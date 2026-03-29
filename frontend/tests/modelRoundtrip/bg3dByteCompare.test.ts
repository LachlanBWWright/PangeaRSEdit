import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D, type BG3DParseResult } from "@/modelParsers/parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D, getOriginalBG3DBinary, getOriginalSkeletonBinary } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "@/modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
import { unwrap } from "@/types/result";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function compareBuffers(orig: Uint8Array, reser: Uint8Array, label: string) {
  if (orig.length !== reser.length) {
    console.log(`${label}: SIZE MISMATCH: orig=${orig.length} reser=${reser.length} diff=${reser.length - orig.length}`);
    return false;
  }
  let diffCount = 0;
  let firstDiff = -1;
  for (let i = 0; i < orig.length; i++) {
    if (orig[i] !== reser[i]) {
      if (firstDiff === -1) firstDiff = i;
      diffCount++;
      if (diffCount <= 5) {
        console.log(`${label}: Byte diff at offset 0x${i.toString(16)}: orig=0x${(orig[i] ?? 0).toString(16).padStart(2, '0')} reser=0x${(reser[i] ?? 0).toString(16).padStart(2, '0')}`);
      }
    }
  }
  if (diffCount === 0) {
    console.log(`${label}: BYTE-PERFECT (${orig.length} bytes)`);
    return true;
  }
  console.log(`${label}: ${diffCount} byte diffs out of ${orig.length} (first at 0x${firstDiff.toString(16)})`);
  return false;
}

describe("BG3D byte-perfect roundtrip", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  
  const testModels = [
    { game: "ottomatic", name: "Blob" },
    { game: "ottomatic", name: "Otto" },
  ];
  
  testModels.forEach(({ game, name }) => {
    const bg3dPath = join(gamesRoot, game, "skeletons", `${name}.bg3d`);
    const skelPath = join(gamesRoot, game, "skeletons", `${name}.skeleton.rsrc`);
    
    it(`${game}/${name}: direct parse -> serialize is byte-perfect`, async () => {
      if (!existsSync(bg3dPath)) { console.warn("Skip: not found"); return; }
      const originalBg3d = bufferFromFile(bg3dPath);
      const originalSkel = existsSync(skelPath) ? bufferFromFile(skelPath) : undefined;
      
      const skelResource = originalSkel ? await parseSkeletonRsrc(originalSkel) : undefined;
      const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
      const reserialized = bg3dParsedToBG3D(parsed);
      
      const match = compareBuffers(
        new Uint8Array(originalBg3d),
        new Uint8Array(reserialized),
        `${game}/${name} direct`
      );
      expect(match).toBe(true);
    });

    it(`${game}/${name}: GLB roundtrip with preserved binary is byte-perfect`, async () => {
      if (!existsSync(bg3dPath)) { console.warn("Skip: not found"); return; }
      const originalBg3d = bufferFromFile(bg3dPath);
      const originalSkel = existsSync(skelPath) ? bufferFromFile(skelPath) : undefined;
      
      const skelResource = originalSkel ? await parseSkeletonRsrc(originalSkel) : undefined;
      const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
      
      const gltfDoc = bg3dParsedToGLTF(parsed, { bg3dBuffer: originalBg3d, skeletonBuffer: originalSkel });
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(gltfDoc);
      const readDoc = await io.readBinary(glbBytes);
      
      const preservedBg3d = getOriginalBG3DBinary(readDoc);
      expect(preservedBg3d).toBeTruthy();
      if (!preservedBg3d) return;
      
      const match = compareBuffers(
        new Uint8Array(originalBg3d),
        new Uint8Array(preservedBg3d),
        `${game}/${name} GLB preserved`
      );
      expect(match).toBe(true);
      
      if (originalSkel) {
        const preservedSkel = getOriginalSkeletonBinary(readDoc);
        expect(preservedSkel).toBeTruthy();
        if (preservedSkel) {
          const skelMatch = compareBuffers(
            new Uint8Array(originalSkel),
            new Uint8Array(preservedSkel),
            `${game}/${name} skeleton preserved`
          );
          expect(skelMatch).toBe(true);
        }
      }
    });
    
    it(`${game}/${name}: GLB roundtrip (semantic) produces valid BG3D`, async () => {
      if (!existsSync(bg3dPath)) { console.warn("Skip: not found"); return; }
      const originalBg3d = bufferFromFile(bg3dPath);
      const originalSkel = existsSync(skelPath) ? bufferFromFile(skelPath) : undefined;
      
      const skelResource = originalSkel ? await parseSkeletonRsrc(originalSkel) : undefined;
      const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
      
      const gltfDoc = bg3dParsedToGLTF(parsed);
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(gltfDoc);
      const readDoc = await io.readBinary(glbBytes);
      const roundtripped = await gltfToBG3D(readDoc);
      
      expect(roundtripped.materials.length).toBe(parsed.materials.length);
      expect(roundtripped.headerBytes).toBeDefined();
      
      const reserialized = bg3dParsedToBG3D(roundtripped);
      expect(reserialized.byteLength).toBeGreaterThan(0);
      
      // Re-parse to validate structural integrity
      const reparsed = parseBG3D(reserialized);
      expect(reparsed.ok).toBe(true);
    });
  });
});
