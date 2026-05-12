import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { hasCeilingHeightData } from "./terrainCeiling";

describe("terrainCeiling", () => {
  it("detects Bugdom ceiling height data", () => {
    expect(
      hasCeilingHeightData(Game.BUGDOM, {
        YCrd: {
          1000: {
            name: "Floor&Ceiling Y Coords",
            obj: [0],
            order: 3,
          },
          1001: {
            name: "Roof Y Coords",
            obj: [100],
            order: 4,
          },
        },
      }),
    ).toBe(true);
  });

  it("rejects Bugdom levels without ceiling height data", () => {
    expect(
      hasCeilingHeightData(Game.BUGDOM, {
        YCrd: {
          1000: {
            name: "Floor&Ceiling Y Coords",
            obj: [0],
            order: 3,
          },
        },
      }),
    ).toBe(false);
  });

  it("only enables ceiling handling for Bugdom", () => {
    expect(
      hasCeilingHeightData(Game.NANOSAUR, {
        YCrd: {
          1000: {
            name: "Floor&Ceiling Y Coords",
            obj: [0],
            order: 3,
          },
          1001: {
            name: "Roof Y Coords",
            obj: [100],
            order: 4,
          },
        },
      }),
    ).toBe(false);
  });
});
