/**
 * Exact byte-for-byte BG3D + skeleton roundtrip test.
 *
 * Verifies that:
 * - BG3D + skeleton parse cleanly
 * - Both original binaries are preserved in GLB extras
 * - The preserved BG3D and skeleton bytes are exactly identical after GLB roundtrip
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
  getOriginalBG3DBinary,
  getOriginalSkeletonBinary,
} from "@/modelParsers/parsedBg3dGitfConverter";
import { unwrap } from "@/types/result";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function expectExactByteMatch(label: string, original: ArrayBuffer, recovered: ArrayBuffer) {
  const originalBytes = new Uint8Array(original);
  const recoveredBytes = new Uint8Array(recovered);

  expect(recoveredBytes.length, `${label} length mismatch`).toBe(originalBytes.length);

  for (let i = 0; i < originalBytes.length; i++) {
    if (originalBytes[i] !== recoveredBytes[i]) {
      throw new Error(
        `${label} byte mismatch at offset ${i}: original=0x${(originalBytes[i] ?? 0).toString(16)} recovered=0x${(recoveredBytes[i] ?? 0).toString(16)}`,
      );
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BG3D + skeleton exact roundtrip", () => {
  it("preserves Otto BG3D and skeleton bytes through GLB extras", async () => {
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

    const gltfDocument = bg3dParsedToGLTF(parsed, {
      bg3dBuffer: originalBg3d,
      skeletonBuffer: originalSkeleton,
    });

    const io = new NodeIO();
    const glbBytes = await io.writeBinary(gltfDocument);
    expect(glbBytes.byteLength).toBeGreaterThan(0);

    const readDoc = await io.readBinary(glbBytes);
    const recoveredBg3d = getOriginalBG3DBinary(readDoc);
    const recoveredSkeleton = getOriginalSkeletonBinary(readDoc);

    expect(recoveredBg3d).not.toBeNull();
    expect(recoveredSkeleton).not.toBeNull();

    if (!recoveredBg3d || !recoveredSkeleton) {
      throw new Error("Missing preserved binary payloads in GLB extras");
    }

    expectExactByteMatch("BG3D", originalBg3d, recoveredBg3d);
    expectExactByteMatch("skeleton", originalSkeleton, recoveredSkeleton);
  });

});
