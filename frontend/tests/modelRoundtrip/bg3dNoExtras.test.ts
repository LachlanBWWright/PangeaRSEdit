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

describe("BG3D produces clean GLB (no extras)", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  const bg3dPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.bg3d");
  const skelPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.skeleton.rsrc");

  it("GLB has no root extras", async () => {
    if (!existsSync(bg3dPath)) return;
    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkel = bufferFromFile(skelPath);

    const skelResource = await parseSkeletonRsrc(originalSkel);
    const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
    const gltfDoc = bg3dParsedToGLTF(parsed);

    // Verify NO extras on root
    const extras = gltfDoc.getRoot().getExtras();
    const hasContent = extras && Object.keys(extras).length > 0;
    expect(hasContent).toBeFalsy();
    
    // Write and read back - still no extras
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDoc);
    const readDoc = await io.readBinary(glbBytes);
    const readExtras = readDoc.getRoot().getExtras();
    const readHasContent = readExtras && Object.keys(readExtras).length > 0;
    expect(readHasContent).toBeFalsy();
  });
  
  it("GLB roundtrip produces valid game-compatible BG3D", async () => {
    if (!existsSync(bg3dPath)) return;
    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkel = bufferFromFile(skelPath);
    
    const skelResource = await parseSkeletonRsrc(originalSkel);
    const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
    
    // Convert to GLB (clean, no extras)
    const gltfDoc = bg3dParsedToGLTF(parsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDoc);
    
    // Read back and convert to BG3D
    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);
    
    // Verify materials
    expect(roundtripped.materials.length).toBe(parsed.materials.length);
    for (let i = 0; i < parsed.materials.length; i++) {
      const orig = parsed.materials[i];
      const rt = roundtripped.materials[i];
      expect(orig).toBeDefined();
      expect(rt).toBeDefined();
      if (!orig || !rt) {
        return;
      }
      // diffuse color should match
      for (let c = 0; c < 4; c++) {
        expect(Math.abs((rt.diffuseColor[c] ?? 0) - (orig.diffuseColor[c] ?? 0))).toBeLessThan(0.01);
      }
      // flags: textured flag should match
      expect(rt.flags & 1).toBe(orig.flags & 1);
      // texture count should match
      expect(rt.textures.length).toBe(orig.textures.length);
      // texture dimensions should match
      for (let j = 0; j < orig.textures.length; j++) {
        const originalTexture = orig.textures[j];
        const roundtrippedTexture = rt.textures[j];
        expect(originalTexture).toBeDefined();
        expect(roundtrippedTexture).toBeDefined();
        if (!originalTexture || !roundtrippedTexture) {
          return;
        }
        expect(roundtrippedTexture.width).toBe(originalTexture.width);
        expect(roundtrippedTexture.height).toBe(originalTexture.height);
      }
    }
    
    // Verify skeleton
    if (parsed.skeleton) {
      expect(roundtripped.skeleton).toBeDefined();
      if (roundtripped.skeleton) {
        expect(roundtripped.skeleton.bones.length).toBe(parsed.skeleton.bones.length);
        expect(roundtripped.skeleton.animations.length).toBe(parsed.skeleton.animations.length);
      }
    }
    
    // Verify can serialize to valid BG3D
    const reserialized = bg3dParsedToBG3D(roundtripped);
    expect(reserialized.byteLength).toBeGreaterThan(0);
    
    // Verify serialized BG3D can be re-parsed
    const reparsed = parseBG3D(reserialized);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.value.materials.length).toBe(parsed.materials.length);
    }
    
    // Log sizes for comparison
    console.log(`Original BG3D: ${originalBg3d.byteLength} bytes`);
    console.log(`Roundtripped BG3D: ${reserialized.byteLength} bytes`);
    console.log(`Size ratio: ${(reserialized.byteLength / originalBg3d.byteLength * 100).toFixed(1)}%`);
  });
});
