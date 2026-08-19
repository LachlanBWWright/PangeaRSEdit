import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { nanosaur1LevelToLevelData } from "@/data/processors/classicProprocessor";
import {
  compileNanosaur1LevelWithRust,
  parseNanosaur1LevelWithRust,
} from "@/data/level-io/nanosaurLevelCodecWasm";

describe("Nanosaur 1 Rust codec roundtrip", () => {
  const levelPath = join(__dirname, "../../public/assets/nanosaur/terrain/Level1.ter");
  const testFn = existsSync(levelPath) ? it : it.skip;

  testFn("roundtrips Level1.ter byte-for-byte using Rust parse and compile", async () => {
    const originalBuffer = readFileSync(levelPath);
    const originalBytes = new Uint8Array(
      originalBuffer.buffer.slice(
        originalBuffer.byteOffset,
        originalBuffer.byteOffset + originalBuffer.byteLength,
      ),
    );

    const parsedResult = await parseNanosaur1LevelWithRust(originalBytes.buffer);
    if (parsedResult.isErr()) {
      expect.fail(parsedResult.error);
    }
    expect(parsedResult.isOk()).toBe(true);

    const levelData = nanosaur1LevelToLevelData(parsedResult.value, 32, 140, 4.0);
    const compileResult = await compileNanosaur1LevelWithRust(
      levelData,
      originalBytes.buffer,
    );
    if (compileResult.isErr()) {
      expect.fail(compileResult.error);
    }
    expect(compileResult.isOk()).toBe(true);

    const roundtripBytes = new Uint8Array(compileResult.value);
    expect(roundtripBytes).toEqual(originalBytes);
  });
});
