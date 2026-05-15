import { describe, expect, it, vi } from "vitest";
import { err } from "neverthrow";
import { NanosaurGlobals } from "@/data/globals/globals";

const { parseNanosaur1LevelMock } = vi.hoisted(() => ({
  parseNanosaur1LevelMock: vi.fn(),
}));

vi.mock("@/data/level-io/nanosaurLevelCodecWasm", () => ({
  parseNanosaur1LevelWithRust: vi.fn(async () => err("codec unavailable")),
}));

vi.mock("@/data/processors/classicProprocessor", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/data/processors/classicProprocessor")>();
  return {
    ...original,
    parseNanosaur1Level: parseNanosaur1LevelMock,
  };
});

import { parseLevelBytes } from "@/data/level-io/parseLevelBytes";

describe("parseLevelBytes strict Nanosaur Rust mode", () => {
  it("returns a Rust parse error without invoking the JS fallback parser", async () => {
    const result = await parseLevelBytes({
      levelBytes: new ArrayBuffer(16),
      globals: NanosaurGlobals,
      strictRustNanosaur: true,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.fail("Expected parse to fail when Rust parser is unavailable");
    }
    expect(result.error.message).toContain("Nanosaur Rust parser failed");
    expect(parseNanosaur1LevelMock).not.toHaveBeenCalled();
  });
});
