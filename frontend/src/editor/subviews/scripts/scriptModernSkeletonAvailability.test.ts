import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { parseSkeletonRsrcResult } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { getModernSkeletonAvailability, getNativeActorAvailability, MODERN_SKELETON_ANIMATIONS, modernSkeletonNames } from "./scriptModernSkeletonAvailability";

const games = [
  { game: Game.OTTO_MATIC, directory: "OttoMatic-Android" },
  { game: Game.BILLY_FRONTIER, directory: "BillyFrontier-Android" },
  { game: Game.BUGDOM_2, directory: "Bugdom2-Android" },
  { game: Game.CRO_MAG, directory: "CroMagRally-Android" },
  { game: Game.NANOSAUR_2, directory: "Nanosaur2-Android" },
];

describe("native skeleton load lists", () => {
  it.each(games)("matches every bundled animation header for $directory", async ({ game, directory }) => {
    for (const name of modernSkeletonNames(game)) {
      const file = resolve(__dirname, "../../../../../games/pangea-ports/games", directory, "Data/Skeletons", `${name}.skeleton.rsrc`);
      const bytes = Result.fromThrowable(() => readFileSync(file), String)();
      expect(bytes.isOk(), file).toBe(true);
      if (bytes.isErr()) continue;
      const data = bytes.value;
      const parsed = await parseSkeletonRsrcResult(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
      expect(parsed.isOk(), file).toBe(true);
      if (parsed.isOk()) expect(parsed.value.Hedr["1000"]?.obj.numAnims, name).toBe(MODERN_SKELETON_ANIMATIONS[name]);
    }
  });

  it("distinguishes Otto's farm, boss and jungle skeletons", () => {
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, 4, 0)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, 4, 1)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, 0, 2)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, 19, 5)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, 19, 6)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, 4, 0, { initialAnimation: 4 })?.status).toBe("Unavailable");
  });

  it("uses Bugdom 2's tunnel loader and selected exploration area", () => {
    expect(getModernSkeletonAvailability(Game.BUGDOM_2, 0, 3)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.BUGDOM_2, 1, 3)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.BUGDOM_2, 1, 0, { bugdom2Area: "gutter" })?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.BUGDOM_2, 4, 3, { bugdom2Area: "gnome-garden" })?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.BUGDOM_2, 23, 0, { bugdom2Area: "closet" })?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.BUGDOM_2, 2, 0)?.status).toBe("Unavailable");
  });

  it("checks Billy's area mode rather than assuming every skeleton is loaded", () => {
    expect(getModernSkeletonAvailability(Game.BILLY_FRONTIER, 0, 5)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.BILLY_FRONTIER, 4, 5)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.BILLY_FRONTIER, 5, 9)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.BILLY_FRONTIER, 4, 9)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.BILLY_FRONTIER, 7, 9, { areaMode: "shootout" })?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.BILLY_FRONTIER, 0, 0, { areaMode: "target-practice" })?.status).toBe("Unavailable");
  });

  it("checks Cro-Mag's race and battle load lists", () => {
    expect(getModernSkeletonAvailability(Game.CRO_MAG, 2, 16)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.CRO_MAG, 9, 13)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.CRO_MAG, 9, 12)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.CRO_MAG, 11, 0)?.status).toBe("Unavailable");
  });

  it("respects Nanosaur 2 biome overrides and excludes intro-only bonus wormholes", () => {
    expect(getModernSkeletonAvailability(Game.NANOSAUR_2, 5, 0)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.NANOSAUR_2, 5, 2)?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.NANOSAUR_2, 5, 0, { biome: "swamp" })?.status).toBe("Available");
    expect(getModernSkeletonAvailability(Game.NANOSAUR_2, 5, 2, { biome: "forest" })?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.NANOSAUR_2, 3, 0)?.status).toBe("Unavailable");
  });

  it("rejects unknown and reserved skeleton IDs and unsupported actor visuals", () => {
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, 26, 0)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.OTTO_MATIC, -1, 0)?.status).toBe("Unavailable");
    expect(getModernSkeletonAvailability(Game.NANOSAUR_2, 0, 9)?.status).toBe("Unavailable");
    expect(getNativeActorAvailability(Game.BUGDOM_2, "9", 0).status).toBe("Unavailable");
    expect(getNativeActorAvailability(Game.OTTO_MATIC, "999", 0).status).toBe("Unavailable");
    expect(getNativeActorAvailability(Game.OTTO_MATIC, "ottomatic.corn", 0).status).toBe("Available");
    expect(getNativeActorAvailability(Game.OTTO_MATIC, "9", 1).status).toBe("Unavailable");
    expect(getNativeActorAvailability(Game.OTTO_MATIC, "38", 9).status).toBe("Available");
  });
});
