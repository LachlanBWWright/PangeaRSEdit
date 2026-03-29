import { describe, expect, it } from "vitest";
import { readFile, readdir } from "fs/promises";
import { join, relative } from "path";
import {
  load,
  loadBytesFromJson,
  orderedFlatList,
  resourceTypeStr,
  resourceNameStr,
  saveToJson,
} from "@lachlanbwwright/rsrcdump-ts";
import { skeletonSpecs } from "@/python/structSpecs/skeleton/skeleton";

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".skeleton.rsrc")) {
      out.push(fullPath);
    }
  }
  return out;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}

function resourceKey(type: string, num: number): string {
  return `${type}#${num}`;
}

describe("rsrcdump-ts skeleton audit", () => {
  it("compares resource types, IDs, and payload bytes", async () => {
    const skeletonRoot = join(__dirname, "../../public/games");
    const files = await walk(skeletonRoot);
    const bytePerfectFiles: string[] = [];
    const typeOnlyMatches: string[] = [];
    const payloadOnlyMatches: string[] = [];
    const mismatches: Array<{
      file: string;
      missingTypes?: string[];
      missingIds?: string[];
      payloadDiffs?: string[];
      metadataDiffs?: string[];
      originalBytes: number;
      recoveredBytes: number;
    }> = [];

    for (const file of files) {
      const fileBuffer = await readFile(file);
      const originalBytes = new Uint8Array(
        fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength,
        ),
      );

      const parsedResult = await saveToJson(originalBytes, skeletonSpecs, [], []);
      expect(parsedResult.ok).toBe(true);
      if (!parsedResult.ok) {
        continue;
      }

      const serializedResult = loadBytesFromJson(
        JSON.parse(parsedResult.value),
        skeletonSpecs,
        [],
        [],
        true,
      );
      expect(serializedResult.ok).toBe(true);
      if (!serializedResult.ok) {
        continue;
      }

      const recoveredBytes = serializedResult.value;
      const originalForkResult = load(originalBytes);
      const recoveredForkResult = load(recoveredBytes);
      expect(originalForkResult.ok).toBe(true);
      expect(recoveredForkResult.ok).toBe(true);
      if (!originalForkResult.ok || !recoveredForkResult.ok) {
        continue;
      }

      const originalFork = originalForkResult.value;
      const recoveredFork = recoveredForkResult.value;

      const originalFlat = orderedFlatList(originalFork).map((res) => ({
        type: resourceTypeStr(res),
        num: res.num,
        data: res.data,
        name: resourceNameStr(res),
        flags: res.flags,
        junk: res.junk,
      }));
      const recoveredFlat = orderedFlatList(recoveredFork).map((res) => ({
        type: resourceTypeStr(res),
        num: res.num,
        data: res.data,
        name: resourceNameStr(res),
        flags: res.flags,
        junk: res.junk,
      }));

      const originalMap = new Map(originalFlat.map((res) => [resourceKey(res.type, res.num), res]));
      const recoveredMap = new Map(recoveredFlat.map((res) => [resourceKey(res.type, res.num), res]));

      const missingTypes: string[] = [];
      const missingIds: string[] = [];
      const payloadDiffs: string[] = [];
      const metadataDiffs: string[] = [];

      const originalTypes = [...new Set(originalFlat.map((res) => res.type))];
      const recoveredTypes = [...new Set(recoveredFlat.map((res) => res.type))];
      for (const type of originalTypes) {
        if (!recoveredTypes.includes(type)) {
          missingTypes.push(type);
        }
      }
      for (const type of recoveredTypes) {
        if (!originalTypes.includes(type)) {
          missingTypes.push(`unexpected:${type}`);
        }
      }

      for (const [key, originalRes] of originalMap) {
        const recoveredRes = recoveredMap.get(key);
        if (!recoveredRes) {
          missingIds.push(key);
          continue;
        }
        if (!sameBytes(originalRes.data, recoveredRes.data)) {
          payloadDiffs.push(
            `${key} payload ${originalRes.data.length} -> ${recoveredRes.data.length}`,
          );
        }
        if (
          originalRes.name !== recoveredRes.name ||
          originalRes.flags !== recoveredRes.flags ||
          originalRes.junk !== recoveredRes.junk
        ) {
          metadataDiffs.push(
            `${key} name=${JSON.stringify(originalRes.name)}=>${JSON.stringify(recoveredRes.name)} flags=${originalRes.flags}=>${recoveredRes.flags} junk=${originalRes.junk}=>${recoveredRes.junk}`,
          );
        }
      }

      if (
        missingTypes.length === 0 &&
        missingIds.length === 0 &&
        payloadDiffs.length === 0 &&
        metadataDiffs.length === 0 &&
        sameBytes(originalBytes, recoveredBytes)
      ) {
        bytePerfectFiles.push(relative(skeletonRoot, file));
      } else if (
        missingTypes.length === 0 &&
        missingIds.length === 0 &&
        payloadDiffs.length === 0 &&
        metadataDiffs.length === 0
      ) {
        payloadOnlyMatches.push(relative(skeletonRoot, file));
      } else if (
        missingTypes.length === 0 &&
        missingIds.length === 0 &&
        payloadDiffs.length === 0
      ) {
        typeOnlyMatches.push(relative(skeletonRoot, file));
      } else {
        mismatches.push({
          file: relative(skeletonRoot, file),
          missingTypes: missingTypes.length ? missingTypes : undefined,
          missingIds: missingIds.length ? missingIds : undefined,
          payloadDiffs: payloadDiffs.length ? payloadDiffs : undefined,
          metadataDiffs: metadataDiffs.length ? metadataDiffs : undefined,
          originalBytes: originalBytes.length,
          recoveredBytes: recoveredBytes.length,
        });
      }
    }

    console.log("byte-perfect files:", JSON.stringify(bytePerfectFiles, null, 2));
    console.log("type-and-payload matches but byte diffs remain:", JSON.stringify(payloadOnlyMatches, null, 2));
    console.log("type-only matches:", JSON.stringify(typeOnlyMatches, null, 2));
    console.log("resource mismatches:", JSON.stringify(mismatches, null, 2));

    expect(files.length).toBeGreaterThan(0);
  });
});
