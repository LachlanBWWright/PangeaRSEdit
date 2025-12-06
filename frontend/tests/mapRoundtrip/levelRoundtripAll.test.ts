/**
 * Auto-discover and roundtrip every game's Data/Terrain *.ter.rsrc files
 * Tests: load -> saveToJsonObject (hex-only) -> loadFromJson -> saveToBytes
 * Compares resulting bytes to the original file and reports first differing offset.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  load,
  saveToJsonObject,
  loadFromJson,
  saveToBytes,
} from "../../../src/rsrcdump-ts/rsrcdump";

function findTerrainFiles(gamesRoot: string): Array<{ game: string; path: string }>{
  const results: Array<{ game: string; path: string }> = [];
  if (!existsSync(gamesRoot)) return results;

  const entries = readdirSync(gamesRoot, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const gameName = e.name;
    const terrainDir = join(gamesRoot, gameName, "Data", "Terrain");
    if (!existsSync(terrainDir)) continue;
    try {
      const files = readdirSync(terrainDir);
      for (const f of files) {
        if (f.endsWith(".ter.rsrc") || f.endsWith(".ter")) {
          results.push({ game: gameName, path: join(terrainDir, f) });
        }
      }
    } catch {
      // ignore unreadable dirs
    }
  }

  return results;
}

function firstDifference(a: Uint8Array, b: Uint8Array): { offset: number | null; count: number } {
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
  const gamesRoot = join(__dirname, "../../../games");
  const terrainFiles = findTerrainFiles(gamesRoot);

  if (terrainFiles.length === 0) {
    it("should find terrain files (smoke)", () => {
      // If no files found, at least assert the games folder exists
      expect(existsSync(gamesRoot)).toBe(true);
    });
    return;
  }

  for (const entry of terrainFiles) {
    const { game, path } = entry;
    // Create a test per-level so failures are granular
    it(`${game} - ${path.replace(/.*Data\/Terrain\//, "")}: byte-for-byte hex roundtrip`, () => {
      expect(existsSync(path)).toBe(true);
      const orig = readFileSync(path);
      expect(orig.length).toBeGreaterThan(0);

      // Parse into JSON using hex-only (no struct specs) to ensure roundtrip works at resource-fork level
      const jsonRes = saveToJsonObject(orig, [], [], [], false);
      expect(jsonRes.ok).toBe(true);
      if (!jsonRes.ok) return;
      const json1 = jsonRes.value;

      // Recreate resource fork from JSON
      const forkRes = loadFromJson(json1, [], false);
      expect(forkRes.ok).toBe(true);
      if (!forkRes.ok) return;
      const fork = forkRes.value;

      // Serialize back to bytes
      const bytes = saveToBytes(fork);
      expect(bytes).toBeDefined();
      expect(bytes.length).toBeGreaterThan(0);

      // Compare
      const origArr = new Uint8Array(orig.buffer, orig.byteOffset, orig.byteLength);
      const newArr = new Uint8Array(bytes.buffer ? bytes.buffer : bytes, 0, bytes.length);

      const { offset, count } = firstDifference(origArr, newArr);
      const equal = count === 0;

      if (!equal) {
        // Provide actionable diagnostics in the test output
        console.error(`${game} ${path} roundtrip mismatch: first diff offset=${offset}, differing bytes=${count}, origLen=${origArr.length}, newLen=${newArr.length}`);
      }

      expect(equal).toBe(true);
    });
  }
});
