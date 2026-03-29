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

describe("BG3D texture roundtrip", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  const bg3dPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.bg3d");
  const skelPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.skeleton.rsrc");

  it("Blob: compare texture details through GLB", async () => {
    if (!existsSync(bg3dPath)) return;
    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkel = bufferFromFile(skelPath);
    
    const skelResource = await parseSkeletonRsrc(originalSkel);
    const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
    
    const gltfDoc = bg3dParsedToGLTF(parsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDoc);
    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);
    
    for (let mi = 0; mi < Math.min(parsed.materials.length, roundtripped.materials.length); mi++) {
      const origMat = parsed.materials[mi]!;
      const rtMat = roundtripped.materials[mi]!;
      console.log(`Material ${mi}: origFlags=${origMat.flags} rtFlags=${rtMat.flags}`);
      
      for (let ti = 0; ti < Math.min(origMat.textures.length, rtMat.textures.length); ti++) {
        const origTex = origMat.textures[ti]!;
        const rtTex = rtMat.textures[ti]!;
        console.log(`  OrigTex: ${origTex.width}x${origTex.height} src=${origTex.srcPixelFormat} dst=${origTex.dstPixelFormat} bufSz=${origTex.bufferSize} pixLen=${origTex.pixels.length}`);
        console.log(`  RtTex:   ${rtTex.width}x${rtTex.height} src=${rtTex.srcPixelFormat} dst=${rtTex.dstPixelFormat} bufSz=${rtTex.bufferSize} pixLen=${rtTex.pixels.length}`);
        
        // Check first few pixel bytes
        const origFirst5 = Array.from(origTex.pixels.slice(0, 15)).map(b => b.toString(16).padStart(2,'0')).join(' ');
        const rtFirst5 = Array.from(rtTex.pixels.slice(0, 15)).map(b => b.toString(16).padStart(2,'0')).join(' ');
        console.log(`  OrigPixels[0:15]: ${origFirst5}`);
        console.log(`  RtPixels[0:15]:   ${rtFirst5}`);
      }
    }
    
    // Also check what the glTF textures look like
    const textures = readDoc.getRoot().listTextures();
    textures.forEach((tex, i) => {
      const img = tex.getImage();
      const mime = tex.getMimeType();
      console.log(`\nglTF Texture ${i}: mime=${mime} imgSize=${img?.length ?? 0}`);
      if (img) {
        console.log(`  First bytes: ${Array.from(img.slice(0, 8)).map(b => b.toString(16).padStart(2,'0')).join(' ')}`);
      }
    });
  });
});
