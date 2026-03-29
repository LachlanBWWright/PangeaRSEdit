import { describe, it } from "vitest";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { bg3dParsedToGLTF } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { unwrap } from "@/types/result";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NodeIO, type Node } from "@gltf-transform/core";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteLength + buf.byteOffset);
}

function dumpNode(node: Node, indent: string) {
  const mesh = node.getMesh();
  const skin = node.getSkin();
  const children = node.listChildren();
  console.log(`${indent}Node "${node.getName()}" mesh=${mesh?.getName() ?? 'none'} skin=${skin?.getName() ?? 'none'} children=${children.length}`);
  for (const child of children) {
    dumpNode(child, indent + "  ");
  }
}

describe("glTF scene structure", () => {
  const gamesRoot = join(__dirname, "../../public/games");
  const bg3dPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.bg3d");
  const skelPath = join(gamesRoot, "ottomatic", "skeletons", "Blob.skeleton.rsrc");

  it("Blob: dump glTF scene", async () => {
    if (!existsSync(bg3dPath)) return;
    const originalBg3d = bufferFromFile(bg3dPath);
    const skelResource = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(originalBg3d, skelResource));
    
    const gltfDoc = bg3dParsedToGLTF(parsed);
    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDoc);
    const readDoc = await io.readBinary(glbBytes);
    
    const scenes = readDoc.getRoot().listScenes();
    scenes.forEach((scene, i) => {
      console.log(`Scene ${i}: "${scene.getName()}"`);
      scene.listChildren().forEach(child => dumpNode(child, "  "));
    });
    
    console.log("\n--- All meshes ---");
    readDoc.getRoot().listMeshes().forEach((mesh, i) => {
      const prims = mesh.listPrimitives();
      console.log(`Mesh ${i}: "${mesh.getName()}" prims=${prims.length}`);
      prims.forEach((prim, j) => {
        const posAcc = prim.getAttribute("POSITION");
        const normAcc = prim.getAttribute("NORMAL");
        const uvAcc = prim.getAttribute("TEXCOORD_0");
        const idxAcc = prim.getIndices();
        console.log(`  Prim ${j}: pos=${posAcc?.getCount() ?? 0} norm=${normAcc?.getCount() ?? 0} uv=${uvAcc?.getCount() ?? 0} idx=${idxAcc?.getCount() ?? 0}`);
      });
    });
  });
});
