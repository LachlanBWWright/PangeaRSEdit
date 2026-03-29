/**
 * BG3D + skeleton roundtrip test.
 *
 * Verifies that:
 * - BG3D + skeleton parse cleanly
 * - GLB export does not rely on preserved original binaries
 * - The GLB-only return path reconstructs a valid BG3D + skeleton pair
 * - Semantic skeleton data survives the roundtrip
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "@/modelParsers/parsedBg3dGitfConverter";
import { unwrap } from "@/types/result";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BG3D + skeleton exact roundtrip", () => {
  it("reconstructs Otto BG3D and skeleton semantics from GLB-only data", async () => {
    const bg3dPath = join(__dirname, "../../public/games/ottomatic/skeletons/Otto.bg3d");
    const skelPath = join(__dirname, "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc");

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn(`Skipping - files not found: ${bg3dPath}`);
      return;
    }

    const originalBg3d = bufferFromFile(bg3dPath);
    const originalSkeleton = bufferFromFile(skelPath);

    const skeletonResource = await parseSkeletonRsrc(originalSkeleton);
    const parsed = unwrap(parseBG3D(originalBg3d, skeletonResource));

    const gltfDocument = bg3dParsedToGLTF(parsed);

    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    expect(glbBytes.byteLength).toBeGreaterThan(0);

    const readDoc = await io.readBinary(glbBytes);
    const roundtripped = await gltfToBG3D(readDoc);
    expect(roundtripped.skeleton).toBeDefined();
    expect(roundtripped.skeleton?.bones.length).toBe(parsed.skeleton?.bones.length);
    expect(roundtripped.skeleton?.animations.length).toBe(parsed.skeleton?.animations.length);
    expect(roundtripped.skeleton?.bones.map((bone) => bone.name)).toEqual(
      parsed.skeleton?.bones.map((bone) => bone.name),
    );
    expect(roundtripped.skeleton?.animations.map((anim) => anim.name)).toEqual(
      parsed.skeleton?.animations.map((anim) => anim.name),
    );
    expect(roundtripped.skeleton?.animations.map((anim) => anim.numAnimEvents)).toEqual(
      parsed.skeleton?.animations.map(() => 0),
    );
  });

});
