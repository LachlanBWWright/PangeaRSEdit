import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("glTF texture buffer handling", () => {
  it("converts PNG textures from exact Uint8Array ranges without trailing bytes", async () => {
    const bg3dPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Blob.bg3d",
    );
    const skeletonPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Blob.skeleton.rsrc",
    );

    if (!existsSync(bg3dPath) || !existsSync(skeletonPath)) {
      return;
    }

    const skeleton = await parseSkeletonRsrc(bufferFromFile(skeletonPath));
    const parsedResult = parseBG3D(bufferFromFile(bg3dPath), skeleton);
    expect(parsedResult.isOk()).toBe(true);
    if (parsedResult.isErr()) {
      return;
    }

    const doc = bg3dParsedToGLTF(parsedResult.value);
    const texture = doc.getRoot().listTextures()[0];
    expect(texture).toBeDefined();
    if (!texture) {
      return;
    }

    const image = texture.getImage();
    expect(image).toBeInstanceOf(Uint8Array);
    if (!(image instanceof Uint8Array)) {
      return;
    }

    const paddedBytes = new Uint8Array(image.byteLength + 16);
    paddedBytes.set(image, 0);
    paddedBytes.set(
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      image.byteLength,
    );
    texture.setImage(
      new Uint8Array(paddedBytes.buffer, 0, image.byteLength),
    );

    const converted = await gltfToBG3D(doc);

    expect(converted.materials.length).toBeGreaterThan(0);
    expect(converted.materials[0]?.textures.length ?? 0).toBeGreaterThan(0);
  });
});
