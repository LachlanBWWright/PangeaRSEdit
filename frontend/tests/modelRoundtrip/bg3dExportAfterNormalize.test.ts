import { describe, it, expect } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseBG3D, bg3dParsedToBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";
import { unwrap } from "@/types/result";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("BG3D roundtrip after GLB normalize (simulating bone edit)", () => {
  it("exports back to BG3D after GLB write-read-write cycle", async () => {
    const bg3dPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.bg3d",
    );
    const skelPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
    );

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn("Skipping - Otto files not found");
      return;
    }

    // Step 1: Parse original BG3D + skeleton
    const skeleton = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(bufferFromFile(bg3dPath), skeleton));

    expect(parsed.skeleton).toBeDefined();
    expect(parsed.materials.length).toBeGreaterThan(0);

    // Step 2: Convert to glTF document (same as initial load)
    const doc = bg3dParsedToGLTF(parsed);

    // Step 3: Write to GLB (same as initial load)
    const io = new NodeIO();
    const glb1 = await io.writeBinary(doc);

    // Step 4: Read and re-write (simulating normalizeGlbBuffer after bone edit)
    const doc2 = await io.readBinary(glb1);
    const glb2 = await io.writeBinary(doc2);

    // Step 5: Read again and re-write (second normalize)
    const doc3 = await io.readBinary(glb2);
    const glb3 = await io.writeBinary(doc3);

    // Step 6: Read and convert back to BG3D (this is the failing path)
    const doc4 = await io.readBinary(glb3);

    // Check textures for padding issues
    const textures = doc4.getRoot().listTextures();
    for (const tex of textures) {
      if (!tex) continue;
      const image = tex.getImage();
      if (!(image instanceof Uint8Array)) continue;

      // Find IEND marker
      let iendPos = -1;
      for (let j = image.byteLength - 12; j >= 0; j--) {
        if (
          image[j] === 0x49 &&
          image[j + 1] === 0x45 &&
          image[j + 2] === 0x4e &&
          image[j + 3] === 0x44
        ) {
          iendPos = j;
          break;
        }
      }

      if (iendPos >= 0) {
        const pngEnd = iendPos + 4 + 4; // IEND type + CRC
        const extraBytes = image.byteLength - pngEnd;
        expect(extraBytes).toBeLessThanOrEqual(image.byteLength);
      }
    }

    // This is the actual failing call: gltfToBG3D should not throw
    const parsedBg3d = await gltfToBG3D(doc4);
    expect(parsedBg3d.materials.length).toBeGreaterThan(0);

    // And serialization should work too
    const bg3dBytes = bg3dParsedToBG3D(parsedBg3d);
    expect(bg3dBytes.byteLength).toBeGreaterThan(0);
  });
});
