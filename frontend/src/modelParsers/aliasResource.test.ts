import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3D } from "./parseBG3D";
import { parse3DMFToMetaFile, metaFileToBG3DParseResult } from "./threeDMF";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { getBG3DExportTarget } from "./bg3dExportTargets";
import { unwrap } from "@/types/result";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function assertContainsAscii(bytes: ArrayBuffer, needle: string): void {
  const text = new TextDecoder("latin1").decode(bytes);
  expect(text.includes(needle)).toBe(true);
}

describe("aliasResource", () => {
  it("synthesizes a BG3D alias for Otto-style exports", async () => {
    const bg3dPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.bg3d",
    );
    const skelPath = join(
      __dirname,
      "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
    );

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn(`Skipping - files not found: ${bg3dPath}`);
      return;
    }

    const bg3d = bufferFromFile(bg3dPath);
    const skeleton = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsed = unwrap(parseBG3D(bg3d, skeleton));
    if (!parsed.skeleton) {
      throw new Error("Expected Otto skeleton data");
    }

    const exported = bg3dSkeletonToSkeletonResource(
      { ...parsed.skeleton, alisData: undefined },
      undefined,
      undefined,
      undefined,
      undefined,
      "Blob",
      getBG3DExportTarget("ottomatic"),
    );

    const binaryResult = skeletonResourceToBinary(exported);
    expect(binaryResult.isOk()).toBe(true);
    if (binaryResult.isErr()) {
      throw binaryResult.error;
    }

    assertContainsAscii(binaryResult.value, "Blob.3df");
    assertContainsAscii(binaryResult.value, "Blob.bg3d");
    assertContainsAscii(
      binaryResult.value,
      "Projects:Otto:Project:Data:Skeletons:Blob.bg3d",
    );
    assertContainsAscii(
      binaryResult.value,
      "Projects:Otto:Project:Data:Skeletons:Blob.3df",
    );
  });

  it("synthesizes a 3DMF alias for Bugdom-style exports", async () => {
    const bg3dPath = join(
      __dirname,
      "../../public/games/bugdom1/skeletons/Buddy.3dmf",
    );
    const skelPath = join(
      __dirname,
      "../../public/games/bugdom1/skeletons/Buddy.skeleton.rsrc",
    );

    if (!existsSync(bg3dPath) || !existsSync(skelPath)) {
      console.warn(`Skipping - files not found: ${bg3dPath}`);
      return;
    }

    const bg3d = bufferFromFile(bg3dPath);
    const skeleton = await parseSkeletonRsrc(bufferFromFile(skelPath));
    const parsedMeta = parse3DMFToMetaFile(bg3d);
    expect(parsedMeta.isOk()).toBe(true);
    if (parsedMeta.isErr()) {
      throw parsedMeta.error;
    }

    const parsed = metaFileToBG3DParseResult(parsedMeta.value);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) {
      throw parsed.error;
    }
    if (!parsed.value.skeleton) {
      throw new Error("Expected Bugdom skeleton data");
    }

    const exported = bg3dSkeletonToSkeletonResource(
      { ...parsed.value.skeleton, alisData: undefined },
      undefined,
      undefined,
      undefined,
      undefined,
      "Blob",
      getBG3DExportTarget("bugdom"),
    );

    const binaryResult = skeletonResourceToBinary(exported);
    expect(binaryResult.isOk()).toBe(true);
    if (binaryResult.isErr()) {
      throw binaryResult.error;
    }

    assertContainsAscii(binaryResult.value, "Blob.3df");
    assertContainsAscii(
      binaryResult.value,
      "Projects:Bugdom:Data:Skeletons:Blob.3df",
    );
  });
});
