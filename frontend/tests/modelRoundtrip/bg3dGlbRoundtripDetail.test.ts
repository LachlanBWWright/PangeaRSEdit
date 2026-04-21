import { describe, it, expect } from "vitest";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
// migrated from custom unwrap helper to neverthrow instance methods
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";

function isGeometryChild(
  child: unknown,
): child is {
  numPoints: number;
  numTriangles: number;
  numMaterials: number;
  layerMaterialNum?: number[];
} {
  return typeof child === "object" && child !== null && "numPoints" in child;
}

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("BG3D GLB roundtrip detail", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  const bg3dPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.bg3d");
  const skelPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.skeleton.rsrc");
  
  it("Blob: analyze GLB roundtrip differences", async () => {
    if (!existsSync(bg3dPath)) return;
    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkel = bufferFromFile(skelPath);
    
    const skelResource = await parseSkeletonRsrc(originalSkel);
    const parsedRes = parseBG3D(originalBg3d, skelResource);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    
    console.log("=== ORIGINAL ===");
    parsed.materials.forEach((mat, i) => {
      console.log(`Material ${i}: diffuse=${JSON.stringify(mat.diffuseColor)} flags=${mat.flags}`);
      mat.textures.forEach((tex, j) => {
        console.log(`  Tex ${j}: ${tex.width}x${tex.height} src=${tex.srcPixelFormat} dst=${tex.dstPixelFormat} bufSz=${tex.bufferSize} pixLen=${tex.pixels.length}`);
      });
    });
    
    parsed.groups.forEach((g, i) => {
      console.log(`Group ${i}: ${g.children?.length ?? 0} children`);
      g.children?.forEach((child, j) => {
        if (isGeometryChild(child)) {
          console.log(`  Geom ${j}: nPts=${child.numPoints} nTri=${child.numTriangles} nMats=${child.numMaterials} layers=[${child.layerMaterialNum?.join(',')}]`);
        }
      });
    });
    
    // Convert to GLB and back
    const gltfDoc = bg3dParsedToGLTF(parsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDoc);
    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);
    
    console.log("\n=== ROUNDTRIPPED ===");
    roundtripped.materials.forEach((mat, i) => {
      console.log(`Material ${i}: diffuse=${JSON.stringify(mat.diffuseColor)} flags=${mat.flags}`);
      mat.textures.forEach((tex, j) => {
        console.log(`  Tex ${j}: ${tex.width}x${tex.height} src=${tex.srcPixelFormat} dst=${tex.dstPixelFormat} bufSz=${tex.bufferSize} pixLen=${tex.pixels.length}`);
      });
    });
    
    roundtripped.groups.forEach((g, i) => {
      console.log(`Group ${i}: ${g.children?.length ?? 0} children`);
      g.children?.forEach((child, j) => {
        if (isGeometryChild(child)) {
          console.log(`  Geom ${j}: nPts=${child.numPoints} nTri=${child.numTriangles} nMats=${child.numMaterials} layers=[${child.layerMaterialNum?.join(',')}]`);
        }
      });
    });
    
    // Compare textures pixel-by-pixel
    for (let i = 0; i < Math.min(parsed.materials.length, roundtripped.materials.length); i++) {
      const origTex = parsed.materials[i]?.textures?.[0];
      const rtTex = roundtripped.materials[i]?.textures?.[0];
      if (origTex && rtTex) {
        let texDiff = 0;
        const minLen = Math.min(origTex.pixels.length, rtTex.pixels.length);
        for (let b = 0; b < minLen; b++) {
          if (origTex.pixels[b] !== rtTex.pixels[b]) texDiff++;
        }
        console.log(`\nTexture ${i}: orig=${origTex.pixels.length} rt=${rtTex.pixels.length} diffs=${texDiff}/${minLen}`);
        if (origTex.pixels.length !== rtTex.pixels.length) {
          console.log(`  SIZE DIFF: ${rtTex.pixels.length - origTex.pixels.length}`);
        }
      }
    }
  });
});
