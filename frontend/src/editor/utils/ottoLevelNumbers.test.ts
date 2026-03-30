import { describe, expect, it } from "vitest";
import {
  OTTO_LEVELS,
  inferLevelNumberFromFilename,
  DEFAULT_OTTO_LEVEL,
} from "./ottoLevelNumbers";

describe("OTTO_LEVELS", () => {
  it("contains exactly 10 levels numbered 0–9", () => {
    expect(OTTO_LEVELS).toHaveLength(10);
    OTTO_LEVELS.forEach((l, i) => {
      expect(l.levelNumber).toBe(i);
    });
  });
});

describe("inferLevelNumberFromFilename", () => {
  it("infers level 0 from EarthFarm.ter", () => {
    expect(inferLevelNumberFromFilename("EarthFarm.ter")).toBe(0);
  });

  it("infers level 9 from BrainBoss.ter", () => {
    expect(inferLevelNumberFromFilename("BrainBoss.ter")).toBe(9);
  });

  it("handles full path with slashes", () => {
    expect(
      inferLevelNumberFromFilename("assets/ottoMatic/terrain/Cloud.ter"),
    ).toBe(4);
  });

  it("is case-insensitive", () => {
    expect(inferLevelNumberFromFilename("earthfarm.ter")).toBe(0);
    expect(inferLevelNumberFromFilename("EARTHFARM.TER")).toBe(0);
  });

  it("returns undefined for unknown filename", () => {
    expect(inferLevelNumberFromFilename("CustomLevel.ter")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(inferLevelNumberFromFilename("")).toBeUndefined();
  });
});

describe("DEFAULT_OTTO_LEVEL", () => {
  it("is a valid index into OTTO_LEVELS", () => {
    expect(OTTO_LEVELS[DEFAULT_OTTO_LEVEL]).toBeDefined();
  });
});
