import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { saveToJson, loadBytesFromJson } from "@lachlanbwwright/rsrcdump-ts";
import { bugdomSpecs } from "../../src/python/structSpecs/bugdom";
import { preprocessJson } from "../../src/data/processors/ottoPreprocessor";
import { fixNullToZero } from "../../src/data/processors/nullToZeroFixer";
import { BugdomGlobals } from "../../src/data/globals/globals";
import { validateLevelDataForGame } from "../../src/validation/validateLevelForGame";
import { splitLevelData, combineLevelData, sanitizeResourceForkJson } from "../../src/data/utils/levelDataUtils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("Bugdom 1 Full Save Pipeline", () => {
  const terrainDir = join(__dirname, "../../public/assets/bugdom/terrain");
  
  it("should complete full save pipeline for Lawn.ter.rsrc", async () => {
    const data = readFileSync(join(terrainDir, "Lawn.ter.rsrc"));
    
    // Parse
    const parseResult = await saveToJson(new Uint8Array(data), bugdomSpecs, [], []);
    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;
    
    const parsed: Record<string, unknown> = JSON.parse(parseResult.value);
    fixNullToZero(parsed);
    
    const preprocessResult = preprocessJson(parsed, BugdomGlobals);
    expect(preprocessResult.ok).toBe(true);
    
    fixNullToZero(parsed);
    
    const validationResult = validateLevelDataForGame(parsed, BugdomGlobals.GAME_TYPE);
    expect(validationResult.ok).toBe(true);
    
    // Split into atomic data
    const splitResult = splitLevelData(parsed as never);
    expect(splitResult.headerData).not.toBeNull();
    expect(splitResult.terrainData).not.toBeNull();
    
    // Combine back
    const combineResult = combineLevelData(splitResult);
    expect(combineResult.ok).toBe(true);
    if (!combineResult.ok) {
      console.error("Combine error:", combineResult.error.message);
      return;
    }
    
    const combined = combineResult.value;
    
    // Sanitize for save
    const sanitized = sanitizeResourceForkJson(combined);
    console.log("Sanitized keys:", Object.keys(sanitized));
    
    // Serialize with bugdomSpecs
    const serializeResult = loadBytesFromJson(sanitized, bugdomSpecs, [], [], true);
    console.log("Serialize ok:", serializeResult.ok);
    if (!serializeResult.ok) {
      console.error("Serialize error:", serializeResult.error);
    }
    expect(serializeResult.ok).toBe(true);
    
    if (serializeResult.ok) {
      const sizeDiff = Math.abs(serializeResult.value.length - data.length);
      console.log(`Size: original=${data.length}, serialized=${serializeResult.value.length}, diff=${sizeDiff}`);
      expect(sizeDiff).toBeLessThanOrEqual(44);
    }
  });
});
