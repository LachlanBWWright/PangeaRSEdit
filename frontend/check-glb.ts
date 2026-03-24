import { readFileSync } from "fs";
import { NodeIO } from "@gltf-transform/core";

async function main() {
  const io = new NodeIO();
  const doc = await io.read("slug-test.glb");
  const materials = doc.getRoot().listMaterials();
  console.log(`Materials: ${materials.length}`);
  for (const mat of materials) {
    const baseColorTexture = mat.getBaseColorTexture();
    const alphaMode = mat.getAlphaMode();
    const alphaCutoff = mat.getAlphaCutoff();
    const baseColorFactor = mat.getBaseColorFactor();
    console.log(`- Mat "${mat.getName()}": Texture? ${!!baseColorTexture}, AlphaMode: ${alphaMode}, Cutoff: ${alphaCutoff}, Color: ${baseColorFactor}`);
    if (baseColorTexture) {
       console.log(`  Texture mime: ${baseColorTexture.getMimeType()}, size: ${baseColorTexture.getImage()?.length}`);
    }
  }
}
main().catch(console.error);
