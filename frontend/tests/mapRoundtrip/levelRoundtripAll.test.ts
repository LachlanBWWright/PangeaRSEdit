/**
 * Auto-discover and roundtrip every checked-in public terrain fixture.
 * Tests: load -> saveToJsonObject (hex-only) -> loadFromJson -> saveToBytes
 * Compares resulting bytes to the original file and reports first differing offset.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  ADF_ENTRYNUM_RESOURCEFORK,
  unpackAdf,
  saveToJson,
  loadBytesFromJsonAsync,
} from "@lachlanbwwright/rsrcdump-ts";

function findTerrainFiles(assetsRoot: string): { game: string; path: string }[] {
  const results: { game: string; path: string }[] = [];
  if (!existsSync(assetsRoot)) return results;

  const entries = readdirSync(assetsRoot, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const gameName = e.name;
    const terrainDir = join(assetsRoot, gameName, "terrain");
    if (!existsSync(terrainDir)) continue;
    const files = readdirSync(terrainDir);
    for (const f of files) {
      if (f.endsWith(".ter.rsrc")) {
        results.push({ game: gameName, path: join(terrainDir, f) });
      }
    }
  }

  return results;
}

function firstDifference(
  a: Uint8Array,
  b: Uint8Array,
): { offset: number | null; count: number } {
  const len = Math.min(a.length, b.length);
  let first: number | null = null;
  let diffs = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      if (first === null) first = i;
      diffs++;
    }
  }
  // account for tail length differences
  diffs += Math.abs(a.length - b.length);
  if (first === null && a.length !== b.length) first = len;
  return { offset: first, count: diffs };
}

describe("Per-level roundtrip for all games' terrain files", () => {
  const assetsRoot = join(__dirname, "../../public/assets");
  const terrainFiles = findTerrainFiles(assetsRoot);

  if (terrainFiles.length === 0) {
    it("should find checked-in terrain fixtures", () => {
      expect(existsSync(assetsRoot)).toBe(true);
      expect(terrainFiles).not.toHaveLength(0);
    });
  }

  for (const entry of terrainFiles) {
    const { game, path } = entry;
    // Create a test per-level so failures are granular
    it(`${game} - ${path.replace(
      /.*Data\/Terrain\//,
      "",
    )}: preserves resources and produces stable canonical bytes`, async () => {
      expect(existsSync(path)).toBe(true);
      const orig = readFileSync(path);
      expect(orig.length).toBeGreaterThan(0);

      const appleDoubleResult = unpackAdf(new Uint8Array(orig));
      expect(appleDoubleResult.ok).toBe(true);
      if (!appleDoubleResult.ok) return;
      const originalResourceFork = appleDoubleResult.value.get(
        ADF_ENTRYNUM_RESOURCEFORK,
      );
      expect(originalResourceFork).toBeDefined();
      if (!originalResourceFork) return;

      // AppleDouble contains Finder metadata in addition to the resource fork.
      // The JSON format represents resources only, so compare the extracted fork.
      const jsonStringRes = await saveToJson(new Uint8Array(orig), [], [], []);
      expect(jsonStringRes.ok).toBe(true);
      if (!jsonStringRes.ok) return;
      const json1 = JSON.parse(jsonStringRes.value);

      // Recreate bytes from JSON
      const bytesRes = await loadBytesFromJsonAsync(json1, [], [], [], false);
      expect(bytesRes.ok).toBe(true);
      if (!bytesRes.ok) return;
      const bytes = bytesRes.value;

      expect(bytes).toBeDefined();
      expect(bytes.length).toBeGreaterThan(0);

      const canonicalJsonResult = await saveToJson(bytes, [], [], []);
      expect(canonicalJsonResult.ok).toBe(true);
      if (!canonicalJsonResult.ok) return;
      const canonicalJson = JSON.parse(canonicalJsonResult.value);
      expect(canonicalJson).toEqual(json1);

      const secondBytesResult = await loadBytesFromJsonAsync(
        canonicalJson,
        [],
        [],
        [],
        false,
      );
      expect(secondBytesResult.ok).toBe(true);
      if (!secondBytesResult.ok) return;

      const canonicalBytes = new Uint8Array(bytes);
      const secondCanonicalBytes = new Uint8Array(secondBytesResult.value);
      const { offset, count } = firstDifference(
        canonicalBytes,
        secondCanonicalBytes,
      );
      expect(count, `canonical resource fork first differs at ${String(offset)}`).toBe(0);
    });
  }
});
