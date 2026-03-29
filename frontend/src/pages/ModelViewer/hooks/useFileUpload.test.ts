import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseGlbImportResult } from "./useFileUpload";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("GLB import parsing", () => {
  it("falls back to direct BG3D parsing when no skeleton bytes are preserved", async () => {
    const bg3dPath = join(__dirname, "../../../../../public/games/ottomatic/skeletons/Otto.bg3d");
    if (!existsSync(bg3dPath)) {
      console.warn(`Skipping - file not found: ${bg3dPath}`);
      return;
    }

    const bg3dBuffer = bufferFromFile(bg3dPath);
    const result = await parseGlbImportResult({
      type: "glb-to-bg3d",
      result: bg3dBuffer,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.skeleton).toBeUndefined();
  });

  it("prefers parsed GLB data when provided", async () => {
    const bg3dPath = join(__dirname, "../../../../../public/games/ottomatic/skeletons/Otto.bg3d");
    const skelPath = join(__dirname, "../../../../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc");

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn(`Skipping - files not found: ${bg3dPath}`);
      return;
    }

    const bg3dBuffer = bufferFromFile(bg3dPath);
    const skeletonBuffer = bufferFromFile(skelPath);

    const skeletonResource = await parseSkeletonRsrc(skeletonBuffer);
    const parsed = parseBG3DWithSkeletonResource(bg3dBuffer, skeletonResource);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) {
      throw parsed.error;
    }

    const result = await parseGlbImportResult({
      type: "glb-to-bg3d",
      result: bg3dBuffer,
      parsed: parsed.value,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.skeleton).toBeDefined();
  });
});
