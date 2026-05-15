import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3D } from "./parseBG3D";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { getBG3DExportTarget } from "./bg3dExportTargets";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
// Use neverthrow Results directly; avoid unwrap/throws — handle errors explicitly
import { load, orderedFlatList, resourceTypeStr } from "@lachlanbwwright/rsrcdump-ts";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function assertContainsAscii(bytes: ArrayBuffer, needle: string): void {
  const text = new TextDecoder("latin1").decode(bytes);
  expect(text.includes(needle)).toBe(true);
}

function flattenAlis(bytes: ArrayBuffer): Record<number, Uint8Array> {
  const result = load(new Uint8Array(bytes));
  expect(result.ok).toBe(true);
  if (!result.ok) {
    return {};
  }

  const out: Record<number, Uint8Array> = {};
  for (const res of orderedFlatList(result.value)) {
    if (resourceTypeStr(res) === "alis") {
      out[res.num] = res.data;
    }
  }
  return out;
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
    const parsedRes = parseBG3D(bg3d, skeleton);
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsed = parsedRes.value;
    if (!parsed.skeleton) {
      expect.fail("Expected Otto skeleton data");
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
      expect.fail(String(binaryResult.error));
    }

    const original = flattenAlis(bufferFromFile(skelPath));
    const recovered = flattenAlis(binaryResult.value);
    expect(Object.keys(recovered)).toEqual(Object.keys(original));
    expect(recovered[1000]?.byteLength).toBe(original[1000]?.byteLength);
    expect(recovered[1001]?.byteLength).toBe(original[1001]?.byteLength);

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
    const parsed = parseBG3DWithSkeletonResource(bg3d, skeleton);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) {
      expect.fail(String(parsed.error));
    }
    if (!parsed.value.skeleton) {
      expect.fail("Expected Bugdom skeleton data");
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
      expect.fail(String(binaryResult.error));
    }

    assertContainsAscii(binaryResult.value, "Blob.3df");
    assertContainsAscii(
      binaryResult.value,
      "Projects:Bugdom:Data:Skeletons:Blob.3df",
    );
  });
});
