import { describe, it } from "vitest";
import { parseBG3D, bg3dParsedToBG3D, type BG3DGroup, type BG3DGeometry } from "@/modelParsers/parseBG3D";
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

function printGroup(g: BG3DGroup, indent: string) {
  console.log(`${indent}Group: ${g.children?.length ?? 0} children`);
  for (const child of (g.children ?? [])) {
    if ('children' in child && Array.isArray(child.children)) {
      printGroup(child as BG3DGroup, indent + "  ");
    } else {
      const geo = child as BG3DGeometry;
      console.log(`${indent}  Geom: pts=${geo.numPoints} tri=${geo.numTriangles} mats=${geo.numMaterials} layers=[${geo.layerMaterialNum?.join(',')}] flags=${geo.flags}`);
      console.log(`${indent}    vtx=${geo.vertices?.length ?? 0} nrm=${geo.normals?.length ?? 0} uv=${geo.uvs?.length ?? 0} clr=${geo.colors?.length ?? 0} tri=${geo.triangles?.length ?? 0}`);
      if (geo.boundingBox) {
        console.log(`${indent}    bbox min=[${geo.boundingBox.min?.map(n => n.toFixed(2)).join(',')}] max=[${geo.boundingBox.max?.map(n => n.toFixed(2)).join(',')}]`);
      }
    }
  }
}

describe("BG3D geometry roundtrip compare", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  const bg3dPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.bg3d");
  const skelPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.skeleton.rsrc");

  it("Blob: compare geometry through GLB", async () => {
    if (!existsSync(bg3dPath)) return;
    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkel = bufferFromFile(skelPath);
    
    const skelResource = await parseSkeletonRsrc(originalSkel);
    const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
    
    console.log("=== ORIGINAL ===");
    parsed.groups.forEach((g, i) => {
      console.log(`Group ${i}:`);
      printGroup(g, "  ");
    });
    
    const gltfDoc = bg3dParsedToGLTF(parsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDoc);
    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);
    
    console.log("\n=== ROUNDTRIPPED ===");
    roundtripped.groups.forEach((g, i) => {
      console.log(`Group ${i}:`);
      printGroup(g, "  ");
    });
    
    const origReser = bg3dParsedToBG3D(parsed);
    const rtReser = bg3dParsedToBG3D(roundtripped);
    console.log(`\nOriginal serialized: ${origReser.byteLength}`);
    console.log(`Roundtripped serialized: ${rtReser.byteLength}`);
    console.log(`Diff: ${rtReser.byteLength - origReser.byteLength}`);
  });
});
