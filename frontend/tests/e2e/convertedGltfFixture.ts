import { Document, WebIO } from "@gltf-transform/core";
import { convertGltfAsset } from "../../src/editor/subviews/scripts/scriptAssetConversion";

export async function createConvertedTriangleAsset() {
  const document = new Document();
  const buffer = document.createBuffer();
  const primitive = document
    .createPrimitive()
    .setAttribute(
      "POSITION",
      document
        .createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
        .setBuffer(buffer),
    );
  const mesh = document.createMesh().addPrimitive(primitive);
  const node = document.createNode().setMesh(mesh);
  const scene = document.createScene().addChild(node);
  document.getRoot().setDefaultScene(scene);
  const sourceBytes = new Uint8Array(await new WebIO().writeBinary(document));
  const conversion = await convertGltfAsset("converted-triangle.glb", sourceBytes);
  return conversion.map((converted) => converted.nativeBytes);
}
