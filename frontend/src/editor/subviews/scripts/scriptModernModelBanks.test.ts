import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { modernGameplayLevelCount, modernModelBank, modernModelBankCondition } from "./scriptModernModelBanks";

const GAMES = [
  { game: Game.OTTO_MATIC, directory: "ottomatic", levels: 10 },
  { game: Game.BUGDOM_2, directory: "bugdom2", levels: 10 },
  { game: Game.BILLY_FRONTIER, directory: "billyfrontier", levels: 12 },
  { game: Game.CRO_MAG, directory: "cromagrally", levels: 17 },
  { game: Game.NANOSAUR_2, directory: "nanosaur2", levels: 9 },
];
const GROUPS: readonly ("global" | "levelSpecific")[] = ["global", "levelSpecific"];

describe("native gameplay BG3D banks", () => {
  it.each(GAMES)("validates every $directory gameplay bank against bundled geometry", ({ game, directory, levels }) => {
    expect(modernGameplayLevelCount(game)).toBe(levels);
    for (let level = 0; level < levels; level++) {
      for (const group of GROUPS) {
        const bank = modernModelBank(game, group, level);
        if (game === Game.BUGDOM_2 && group === "global" && (level === 3 || level === 6)) {
          expect(bank).toBeNull();
          continue;
        }
        expect(bank).not.toBeNull();
        if (!bank) continue;
        const bytes = readFileSync(join(process.cwd(), "public/games", directory, "models", bank.file));
        const parsed = parseBG3D(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
        expect(parsed.isOk()).toBe(true);
        if (parsed.isOk()) expect(parsed.value.groups[0]?.children.length).toBe(bank.objects);
      }
    }
  });

  it.each(GAMES)("rejects invalid $directory level indices", ({ game, levels }) => {
    for (const level of [-1, levels, 0.5, Number.NaN]) expect(modernModelBank(game, "global", level)).toBeNull();
  });

  it("resolves tunnel, reused and target practice banks", () => {
    expect(modernModelBank(Game.BUGDOM_2, "levelSpecific", 3)?.file).toBe("Level4_Plumbing.bg3d");
    expect(modernModelBank(Game.BUGDOM_2, "levelSpecific", 6)?.file).toBe("Level7_Gutter.bg3d");
    expect(modernModelBank(Game.OTTO_MATIC, "levelSpecific", 6)?.file).toBe("level6_jungle.bg3d");
    expect(modernModelBank(Game.BILLY_FRONTIER, "levelSpecific", 11)?.file).toBe("targetpractice.bg3d");
  });

  it("follows metadata environment and activity overrides", () => {
    expect(modernModelBank(Game.NANOSAUR_2, "levelSpecific", 0, { biome: "swamp" })?.file).toBe("swamp.bg3d");
    expect(modernModelBank(Game.BILLY_FRONTIER, "levelSpecific", 0, { areaMode: "target-practice" })?.file).toBe("targetpractice.bg3d");
    expect(modernModelBank(Game.BILLY_FRONTIER, "levelSpecific", 11, { areaMode: "duel" })?.file).toBe("swamp.bg3d");
    expect(modernModelBank(Game.BUGDOM_2, "levelSpecific", 3, { tunnel: "gutter" })?.file).toBe("Level7_Gutter.bg3d");
    expect(modernModelBank(Game.BUGDOM_2, "global", 3)).toBeNull();
    expect(modernModelBank(Game.BUGDOM_2, "global", 0, { bugdom2Area: "plumbing" })).toBeNull();
    expect(modernModelBank(Game.BUGDOM_2, "levelSpecific", 0, { bugdom2Area: "plumbing" })?.file).toBe("Level7_Gutter.bg3d");
    expect(modernModelBank(Game.BUGDOM_2, "levelSpecific", 3, { bugdom2Area: "park" })).toBeNull();
    expect(modernModelBank(Game.NANOSAUR_2, "global", 0, { biome: "swamp" })?.file).toBe("global.bg3d");
  });

  it("identifies which checks need level metadata", () => {
    expect(modernModelBankCondition(Game.NANOSAUR_2, "levelSpecific", 0)).toContain("level.biome");
    expect(modernModelBankCondition(Game.BILLY_FRONTIER, "levelSpecific", 1)).toContain("area.mode");
    expect(modernModelBankCondition(Game.BUGDOM_2, "levelSpecific", 6)).toContain("level.tunnel");
    expect(modernModelBankCondition(Game.OTTO_MATIC, "levelSpecific", 0)).toBeNull();
    expect(modernModelBankCondition(Game.NANOSAUR_2, "global", 0)).toBeNull();
  });
});
