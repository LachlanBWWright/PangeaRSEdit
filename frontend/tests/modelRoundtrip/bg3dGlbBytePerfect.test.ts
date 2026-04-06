import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "@/modelParsers/parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
// migrated from custom unwrap helper to neverthrow instance methods
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("BG3D GLB roundtrip produces valid re-parseable output", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  
  const models = [
    { game: "ottomatic", name: "Blob" },
    { game: "ottomatic", name: "Otto" },
    { game: "cromagrally", name: "Viking" },
    { game: "bugdom2", name: "Ant" },
    { game: "billyfrontier", name: "Billy" },
    { game: "nanosaur2", name: "brach" },
  ];
  
  models.forEach(({ game, name }) => {
    const bg3dPath = join(gamesRoot, game, "skeletons", `${name}.bg3d`);
    const skelPath = join(gamesRoot, game, "skeletons", `${name}.skeleton.rsrc`);
    
    it(`${game}/${name}: GLB roundtrip produces valid BG3D`, async () => {
      if (!existsSync(bg3dPath)) { console.warn("Skip"); return; }
      const originalBg3d = bufferFromFile(bg3dPath);
      const originalSkel = existsSync(skelPath) ? bufferFromFile(skelPath) : undefined;
      const skelResource = originalSkel ? await parseSkeletonRsrc(originalSkel) : undefined;
      const parsedRes = parseBG3D(originalBg3d, skelResource);
      expect(parsedRes.isOk()).toBe(true);
      if (!parsedRes.isOk()) return;
      const parsed = parsedRes.value;
      
      // No extras in GLB
      const gltfDoc = bg3dParsedToGLTF(parsed);
      const extras = gltfDoc.getRoot().getExtras();
      expect(!extras || Object.keys(extras).length === 0).toBe(true);
      
      const io = new NodeIO();
      const glbBytes = await io.writeBinary(gltfDoc);
      const readDoc = await io.readBinary(glbBytes);
      const roundtripped = await gltfToBG3D(readDoc);
      const reserialized = bg3dParsedToBG3D(roundtripped);
      
      // Must produce valid re-parseable BG3D
      expect(reserialized.byteLength).toBeGreaterThan(0);
      const reparsed = parseBG3D(reserialized);
      expect(reparsed.isOk()).toBe(true);
      if (reparsed.isOk()) {
        expect(reparsed.value.materials.length).toBe(parsed.materials.length);
      }
      
      console.log(`${game}/${name}: orig=${originalBg3d.byteLength} rt=${reserialized.byteLength}`);
    });
  });
});
