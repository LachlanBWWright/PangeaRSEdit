import { describe, it } from "vitest";
import { parseBG3D, type BG3DGroup, type BG3DGeometry } from "@/modelParsers/parseBG3D";
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

function countGroupsTags(g: BG3DGroup, depth: number): { starts: number; ends: number } {
  let starts = depth > 0 ? 1 : 0;
  let ends = depth > 0 ? 1 : 0;
  for (const child of (g.children ?? [])) {
    if ('children' in child && Array.isArray(child.children)) {
      const sub = countGroupsTags(child as BG3DGroup, depth + 1);
      starts += sub.starts;
      ends += sub.ends;
    }
  }
  return { starts, ends };
}

function dumpGroupStructure(g: BG3DGroup | BG3DGeometry, indent: string) {
  if ('children' in g && Array.isArray(g.children)) {
    const group = g as BG3DGroup;
    console.log(`${indent}Group(${group.children.length} children)`);
    for (const child of group.children) {
      dumpGroupStructure(child, indent + "  ");
    }
  } else {
    const geo = g as BG3DGeometry;
    console.log(`${indent}Geom(pts=${geo.numPoints} tri=${geo.numTriangles})`);
  }
}

describe("Otto group structure", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  
  it("Otto: compare group structure", async () => {
    const bg3dPath = join(gamesRoot, "ottomatic", "skeletons", "Otto.bg3d");
    const skelPath = join(gamesRoot, "ottomatic", "skeletons", "Otto.skeleton.rsrc");
    if (!existsSync(bg3dPath)) return;
    
    const originalBg3d = bufferFromFile(bg3dPath);
    const skelResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
    
    console.log("=== ORIGINAL ===");
    for (const group of parsed.groups) {
      dumpGroupStructure(group, "");
    }
    const origTags = countGroupsTags(parsed.groups[0]!, 0);
    console.log(`Original GROUPSTART/END pairs: ${origTags.starts}`);
    
    // GLB roundtrip
    const gltfDoc = bg3dParsedToGLTF(parsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDoc);
    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);
    
    console.log("\n=== ROUNDTRIPPED ===");
    for (const group of roundtripped.groups) {
      dumpGroupStructure(group, "");
    }
    const rtTags = countGroupsTags(roundtripped.groups[0]!, 0);
    console.log(`Roundtripped GROUPSTART/END pairs: ${rtTags.starts}`);
    console.log(`Tag diff: ${(rtTags.starts - origTags.starts)} pairs = ${(rtTags.starts - origTags.starts) * 8} bytes`);
  });
});
