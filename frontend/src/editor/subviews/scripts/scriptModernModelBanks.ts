import { Game } from "@/data/globals/globals";

export interface NativeModelBank {
  readonly file: string;
  readonly objects: number;
}

export interface NativeModelBankOverrides {
  readonly biome?: string;
  readonly areaMode?: string;
  readonly tunnel?: string;
  readonly bugdom2Area?: string;
}

export function modernUsesTunnel(game: Game, level: number, overrides: NativeModelBankOverrides = {}): boolean {
  if (game !== Game.BUGDOM_2) return false;
  if (overrides.bugdom2Area && overrides.bugdom2Area !== "source-default") return ["plumbing", "gutter"].includes(overrides.bugdom2Area);
  return level === 3 || level === 6;
}

export function modernModelBankCondition(game: Game, group: "global" | "levelSpecific", level: number): string | null {
  if (game === Game.BUGDOM_2) return `Level ${level + 1}: level.bugdom2Area metadata selects exploration or tunnel loading; tunnel mode has no global bank, and level.tunnel selects plumbing or gutter geometry.`;
  if (group === "global") return null;
  if (game === Game.NANOSAUR_2) return "The level.biome metadata selects forest, desert or swamp geometry.";
  if (game === Game.BILLY_FRONTIER) return "The area.mode metadata can select the target-practice bank instead of the area's town or swamp bank.";
  return null;
}

// File.c / LoadLevel.c gameplay loaders; counts are checked against bundled BG3D roots.
const OTTO: readonly NativeModelBank[] = [
  { file: "level1_farm.bg3d", objects: 37 }, { file: "level2_slime.bg3d", objects: 30 },
  { file: "level3_blobboss.bg3d", objects: 36 }, { file: "level4_apocalypse.bg3d", objects: 51 },
  { file: "level5_cloud.bg3d", objects: 31 }, { file: "level6_jungle.bg3d", objects: 27 },
  { file: "level6_jungle.bg3d", objects: 27 }, { file: "level8_fireice.bg3d", objects: 60 },
  { file: "level9_saucer.bg3d", objects: 10 }, { file: "level10_brainboss.bg3d", objects: 7 },
];
const BUGDOM2: readonly NativeModelBank[] = [
  { file: "Level1_Garden.bg3d", objects: 18 }, { file: "Level2_Sidewalk.bg3d", objects: 38 },
  { file: "Level1_Garden.bg3d", objects: 18 }, { file: "Level4_Plumbing.bg3d", objects: 5 },
  { file: "Level5_Playroom.bg3d", objects: 33 }, { file: "Level6_Closet.bg3d", objects: 34 },
  { file: "Level7_Gutter.bg3d", objects: 6 }, { file: "Level8_Garbage.bg3d", objects: 20 },
  { file: "Level9_Balsa.bg3d", objects: 8 }, { file: "Level10_Park.bg3d", objects: 27 },
];
const CROMAG: readonly NativeModelBank[] = [
  { file: "desert.bg3d", objects: 14 }, { file: "jungle.bg3d", objects: 12 },
  { file: "ice.bg3d", objects: 7 }, { file: "crete.bg3d", objects: 15 },
  { file: "china.bg3d", objects: 6 }, { file: "egypt.bg3d", objects: 10 },
  { file: "europe.bg3d", objects: 13 }, { file: "scandinavia.bg3d", objects: 20 },
  { file: "atlantis.bg3d", objects: 12 }, { file: "stonehenge.bg3d", objects: 4 },
  { file: "aztec.bg3d", objects: 3 }, { file: "coliseum.bg3d", objects: 3 },
  { file: "crete.bg3d", objects: 15 }, { file: "crete.bg3d", objects: 15 },
  { file: "tarpits.bg3d", objects: 2 }, { file: "crete.bg3d", objects: 15 },
  { file: "ramps.bg3d", objects: 1 },
];
const NANOSAUR2: readonly NativeModelBank[] = [
  { file: "forest.bg3d", objects: 50 }, { file: "desert.bg3d", objects: 52 },
  { file: "swamp.bg3d", objects: 43 },
];
const N2_BIOMES: readonly number[] = [0, 1, 2, 2, 1, 0, 1, 2, 0];

export function modernGameplayLevelCount(game: Game): number | null {
  switch (game) {
    case Game.OTTO_MATIC: return OTTO.length;
    case Game.BUGDOM_2: return BUGDOM2.length;
    case Game.CRO_MAG: return CROMAG.length;
    case Game.NANOSAUR_2: return N2_BIOMES.length;
    case Game.BILLY_FRONTIER: return 12;
    default: return null;
  }
}

export function modernModelBank(game: Game, group: "global" | "levelSpecific", level: number, overrides: NativeModelBankOverrides = {}): NativeModelBank | null {
  const levels = modernGameplayLevelCount(game);
  if (levels === null || !Number.isInteger(level) || level < 0 || level >= levels) return null;
  const tunnel = modernUsesTunnel(game, level, overrides);
  if (game === Game.BUGDOM_2 && tunnel && group === "global") return null;
  if (group === "global") {
    switch (game) {
      case Game.OTTO_MATIC: return { file: "global.bg3d", objects: 36 };
      case Game.BUGDOM_2: return { file: "Global.bg3d", objects: 32 };
      case Game.CRO_MAG: return { file: "global.bg3d", objects: 26 };
      case Game.NANOSAUR_2: return { file: "global.bg3d", objects: 32 };
      case Game.BILLY_FRONTIER: return { file: "global.bg3d", objects: 37 };
      default: return null;
    }
  }
  switch (game) {
    case Game.OTTO_MATIC: return OTTO[level] ?? null;
    case Game.BUGDOM_2:
      if (tunnel) {
        if (overrides.tunnel === "plumbing") return BUGDOM2[3] ?? null;
        if (overrides.tunnel === "gutter") return BUGDOM2[6] ?? null;
        return BUGDOM2[level === 3 ? 3 : 6] ?? null;
      }
      if (level === 3 || level === 6) return null;
      return BUGDOM2[level] ?? null;
    case Game.CRO_MAG: return CROMAG[level] ?? null;
    case Game.NANOSAUR_2:
      if (overrides.biome === "forest") return NANOSAUR2[0] ?? null;
      if (overrides.biome === "desert") return NANOSAUR2[1] ?? null;
      if (overrides.biome === "swamp") return NANOSAUR2[2] ?? null;
      return NANOSAUR2[N2_BIOMES[level] ?? -1] ?? null;
    case Game.BILLY_FRONTIER:
      if (overrides.areaMode === "target-practice") return { file: "targetpractice.bg3d", objects: 8 };
      if (!["duel", "shootout", "stampede"].includes(overrides.areaMode ?? "") && (level === 5 || level === 11)) return { file: "targetpractice.bg3d", objects: 8 };
      return level < 6 ? { file: "town.bg3d", objects: 22 } : { file: "swamp.bg3d", objects: 15 };
    default: return null;
  }
}
