import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { NanosaurGlobals } from "@/data/globals/globals";
import { parseLevelBytes } from "@/data/level-io/parseLevelBytes";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buffer = readFileSync(filePath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe("parseLevelBytes", () => {
  it("parses the shipped Nanosaur 1 level fixture", async () => {
    const levelPath = join(__dirname, "../../public/assets/nanosaur/terrain/Level1.ter");
    if (!existsSync(levelPath)) {
      console.warn(`Skipping - file not found: ${levelPath}`);
      return;
    }

    const result = await parseLevelBytes({
      levelBytes: bufferFromFile(levelPath),
      globals: NanosaurGlobals,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.fail(result.error.message);
    }

    expect(result.value.levelData.Hedr?.[1000]?.obj.mapWidth).toBeGreaterThan(0);
    expect(result.value.levelData.Itms?.[1000]?.obj.length ?? 0).toBeGreaterThan(0);
    expect(result.value.mapImages).toHaveLength(0);
  });
});
