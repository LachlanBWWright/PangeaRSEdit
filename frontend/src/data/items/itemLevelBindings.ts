import { Game } from "../globals/globals";
import { itemTypeNames as billyItemTypeNames } from "./billyFrontierItemType";
import { itemTypeNames as bugdom2ItemTypeNames } from "./bugdom2ItemType";
import { itemTypeNames as bugdomItemTypeNames } from "./bugdomItemType";
import { itemTypeNames as croMagItemTypeNames } from "./croMagItemType";
import { itemTypeNames as mightyMikeItemTypeNames } from "./mightyMikeItemType";
import { itemTypeNames as nanosaur2ItemTypeNames } from "./nanosaur2ItemType";
import { itemTypeNames as nanosaurItemTypeNames } from "./nanosaurItemType";
import { itemTypeNames as ottoItemTypeNames } from "./ottoItemType";
import { splineItemTypeNames as billySplineItemTypeNames } from "../splines/billyFrontierSplineItemType";
import { splineItemTypeNames as bugdom2SplineItemTypeNames } from "../splines/bugdom2SplineItemType";
import { splineItemTypeNames as bugdomSplineItemTypeNames } from "../splines/bugdomSplineItemType";
import { splineItemTypeNames as croMagSplineItemTypeNames } from "../splines/croMagSplineItemType";
import { splineItemTypeNames as nanosaur2SplineItemTypeNames } from "../splines/nanosaur2SplineItemType";
import { splineItemTypeNames as ottoSplineItemTypeNames } from "../splines/ottoSplineItemType";
import { BILLY_FRONTIER_AREAS } from "../../editor/utils/billyFrontierLevelNumbers";
import { BUGDOM2_LEVELS } from "../../editor/utils/bugdom2LevelNumbers";
import { BUGDOM_LEVELS } from "../../editor/utils/bugdomLevelNumbers";
import { CROMAG_TRACKS } from "../../editor/utils/croMagLevelNumbers";
import { MIGHTY_MIKE_LEVELS } from "../../editor/utils/mightyMikeLevelNumbers";
import { NANOSAUR2_LEVELS } from "../../editor/utils/nanosaur2LevelNumbers";
import { NANOSAUR_LEVELS } from "../../editor/utils/nanosaurLevelNumbers";
import { OTTO_LEVELS } from "../../editor/utils/ottoLevelNumbers";

export type ItemLevelBindingKind = "terrainItem" | "splineItem" | "mapItem";

export type ItemLevelBindingStrategy =
  | "static"
  | "level-specific-model"
  | "track-specific-model"
  | "scene-specific-model"
  | "level-aware-behavior";

/** A native item type's availability and level-dependent resolution context. */
export interface ItemLevelBinding {
  readonly game: Game;
  readonly kind: ItemLevelBindingKind;
  readonly itemType: number;
  readonly levelNumbers: readonly number[];
  readonly strategy: ItemLevelBindingStrategy;
  readonly source: string;
  readonly reason: string;
}

interface BindingOverride {
  readonly levelNumbers?: readonly number[];
  readonly strategy: Exclude<ItemLevelBindingStrategy, "static">;
  readonly source: string;
  readonly reason: string;
}

type ItemNames = Readonly<Record<number, string>>;
type LevelInfo = Readonly<Partial<Record<"levelNumber" | "trackNumber" | "areaNumber", number>>>;

const levelNumbers = (levels: readonly LevelInfo[]): readonly number[] =>
  levels.map((level) => level.levelNumber ?? level.trackNumber ?? level.areaNumber ?? 0);

const numericKeys = (names: ItemNames): readonly number[] =>
  Object.keys(names).map(Number).filter(Number.isInteger);

const keyFor = (game: Game, kind: ItemLevelBindingKind, itemType: number): string =>
  `${game}:${kind}:${itemType}`;

function createBindings(
  game: Game,
  kind: ItemLevelBindingKind,
  names: ItemNames,
  levels: readonly number[],
  source: string,
  overrides: Readonly<Record<number, BindingOverride>> = {},
  defaultStrategy: ItemLevelBindingStrategy = "static",
): readonly ItemLevelBinding[] {
  return numericKeys(names).map((itemType) => {
    const override = overrides[itemType];
    return {
      game,
      kind,
      itemType,
      levelNumbers: override?.levelNumbers ?? levels,
      strategy: override?.strategy ?? defaultStrategy,
      source: override?.source ?? source,
      reason: override?.reason ?? "Native item type is present in the authoritative dispatch table.",
    };
  });
}

const allOttoLevels = levelNumbers(OTTO_LEVELS);
const allBugdomLevels = levelNumbers(BUGDOM_LEVELS);
const allBugdom2Levels = levelNumbers(BUGDOM2_LEVELS);
const allCroMagTracks = levelNumbers(CROMAG_TRACKS);
const allBillyAreas = levelNumbers(BILLY_FRONTIER_AREAS);
const allMightyMikeLevels = levelNumbers(MIGHTY_MIKE_LEVELS);
const allNanosaurLevels = levelNumbers(NANOSAUR_LEVELS);
const allNanosaur2Levels = levelNumbers(NANOSAUR2_LEVELS);

const bindings: readonly ItemLevelBinding[] = [
  ...createBindings(Game.OTTO_MATIC, "terrainItem", ottoItemTypeNames, allOttoLevels, "src/Terrain/Terrain2.c", {
    58: {
      levelNumbers: [3, 7],
      strategy: "level-specific-model",
      source: "src/Items/ZipLine.c:198",
      reason: "Zip-line posts use the Apocalypse model at level 3 and the Fire/Ice model at level 7.",
    },
  }),
  ...createBindings(Game.OTTO_MATIC, "splineItem", ottoSplineItemTypeNames, allOttoLevels, "src/Terrain/SplineItems.c"),
  ...createBindings(Game.BUGDOM, "terrainItem", bugdomItemTypeNames, allBugdomLevels, "src/Terrain/Terrain2.c", {
    4: { strategy: "level-specific-model", source: "src/Items/Items.c", reason: "Rocks select level-specific model groups and variants." },
    6: { strategy: "level-specific-model", source: "src/Items/Items.c", reason: "Grass selects level-specific model groups and variants." },
    33: { strategy: "level-specific-model", source: "src/Items/Items.c", reason: "The lawn door selects a level-specific model group." },
  }),
  ...createBindings(Game.BUGDOM, "splineItem", bugdomSplineItemTypeNames, allBugdomLevels, "src/Terrain/SplineItems.c"),
  ...createBindings(Game.BUGDOM_2, "terrainItem", bugdom2ItemTypeNames, allBugdom2Levels, "Source/Terrain/Terrain2.c", {
    13: { strategy: "level-aware-behavior", source: "Source/Items and Source/Terrain dispatch tables", reason: "Doors select level-specific model groups and parameter cases." },
    14: { strategy: "level-aware-behavior", source: "Source/Items and Source/Terrain dispatch tables", reason: "Ride-ball behavior is specialized for the Playroom level." },
    35: { strategy: "level-aware-behavior", source: "Source/Items and Source/Terrain dispatch tables", reason: "Power-up model and parameter cases vary by level." },
  }),
  ...createBindings(Game.BUGDOM_2, "splineItem", bugdom2SplineItemTypeNames, allBugdom2Levels, "Source/Terrain/SplineItems.c"),
  ...createBindings(Game.NANOSAUR, "terrainItem", nanosaurItemTypeNames, allNanosaurLevels, "src/Terrain/Terrain2.c"),
  ...createBindings(Game.NANOSAUR_2, "terrainItem", nanosaur2ItemTypeNames, allNanosaur2Levels, "Source/Terrain/Terrain2.c", {
    5: { strategy: "level-specific-model", source: "Source/Items/Turret.c", reason: "Tower-turret model groups vary by adventure level." },
    10: { strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Grass model groups vary by terrain level." },
    14: { strategy: "level-specific-model", source: "Source/Items/Rocks.c", reason: "Rock model groups vary by terrain level." },
    17: { strategy: "level-specific-model", source: "Source/Items/Mines.c", reason: "Air-mine model groups vary by terrain level." },
    18: { strategy: "level-specific-model", source: "Source/Items/ForestDoor.c", reason: "Forest-door model groups vary by terrain level." },
  }),
  ...createBindings(Game.NANOSAUR_2, "splineItem", nanosaur2SplineItemTypeNames, allNanosaur2Levels, "Source/Terrain/SplineItems.c"),
  ...createBindings(Game.CRO_MAG, "terrainItem", croMagItemTypeNames, allCroMagTracks, "Source/Terrain/Terrain2.c", {
    4: { strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Trees select track-specific model groups and variants." },
    6: { strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Finish-line presentation depends on the selected track." },
    17: { strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Campfire presentation depends on the selected track." },
    20: { strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Pillar model groups and variants depend on the selected track." },
    22: { strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Boat presentation depends on the selected track." },
    24: { strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Statue model groups and variants depend on the selected track." },
    39: { strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "House model groups and variants depend on the selected track." },
  }),
  ...createBindings(Game.CRO_MAG, "splineItem", croMagSplineItemTypeNames, allCroMagTracks, "Source/Terrain/SplineItems.c"),
  ...createBindings(Game.BILLY_FRONTIER, "terrainItem", billyItemTypeNames, allBillyAreas, "Source/Terrain/Terrain2.c", {
    4: { strategy: "level-aware-behavior", source: "Source/Items/Items.c", reason: "Plants use town models before the swamp area and swamp variants from area 6 onward." },
    25: { strategy: "level-aware-behavior", source: "Source/Items/Items.c", reason: "Rocks use town models before the swamp area and swamp variants from area 6 onward." },
  }),
  ...createBindings(Game.BILLY_FRONTIER, "splineItem", billySplineItemTypeNames, allBillyAreas, "Source/Terrain/SplineItems.c"),
  ...createBindings(
    Game.MIGHTY_MIKE,
    "mapItem",
    mightyMikeItemTypeNames,
    allMightyMikeLevels,
    "src/Playfield/Playfield.c",
    {},
    "scene-specific-model",
  ),
];

export const ITEM_LEVEL_BINDINGS: readonly ItemLevelBinding[] = bindings;

const bindingByKey = new Map(
  ITEM_LEVEL_BINDINGS.map((binding) => [keyFor(binding.game, binding.kind, binding.itemType), binding]),
);

export function getItemLevelBinding(game: Game, kind: ItemLevelBindingKind, itemType: number): ItemLevelBinding | undefined {
  return bindingByKey.get(keyFor(game, kind, itemType));
}

export function hasItemLevelBinding(game: Game, kind: ItemLevelBindingKind, itemType: number, levelNumber: number): boolean {
  const binding = getItemLevelBinding(game, kind, itemType);
  return binding?.levelNumbers.includes(levelNumber) ?? false;
}

export function getItemLevelBindings(game: Game, kind?: ItemLevelBindingKind): readonly ItemLevelBinding[] {
  return ITEM_LEVEL_BINDINGS.filter(
    (binding) => binding.game === game && (kind === undefined || binding.kind === kind),
  );
}
