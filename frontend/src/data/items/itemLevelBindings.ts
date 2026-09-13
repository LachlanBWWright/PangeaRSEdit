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
import { OTTO_ITEM_MODEL_MAPPINGS } from "./ottoItemModelMapping";

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

const ottoModelLevelOverrides: Readonly<Record<number, BindingOverride>> =
  Object.fromEntries(
    Object.entries(OTTO_ITEM_MODEL_MAPPINGS).flatMap(([itemType, mapping]) => {
      if (!mapping || !mapping.modelFile.startsWith("level")) return [];
      const levelNumbersByModel: readonly number[] =
        mapping.modelFile === "level1_farm.bg3d" ? [0] :
        mapping.modelFile === "level2_slime.bg3d" ? [1] :
        mapping.modelFile === "level3_blobboss.bg3d" ? [2] :
        mapping.modelFile === "level4_apocalypse.bg3d" ? [3] :
        mapping.modelFile === "level5_cloud.bg3d" ? [4] :
        mapping.modelFile === "level6_jungle.bg3d" ? [5, 6] :
        mapping.modelFile === "level8_fireice.bg3d" ? [7] :
        mapping.modelFile === "level9_saucer.bg3d" ? [8] :
        mapping.modelFile === "level10_brainboss.bg3d" ? [9] : [];
      if (levelNumbersByModel.length === 0) return [];
      return [[Number(itemType), {
        levelNumbers: levelNumbersByModel,
        strategy: "level-specific-model",
        source: "frontend/src/data/items/ottoItemModelMapping.ts",
        reason: "Model mapping resolves this item through " + mapping.modelFile + ".",
      }]];
    }),
  );

const bugdom2Garden = [0];
const bugdom2Sidewalk = [1];
const bugdom2Playroom = [3];
const bugdom2Closet = [4];
const bugdom2Garbage = [6];
const bugdom2Park = [8];
const bugdom2DoorLevels = [0, 1, 3, 4, 6, 8];
const nanosaur2AdventureLevels = [0, 1, 2];

const bindings: readonly ItemLevelBinding[] = [
  ...createBindings(Game.OTTO_MATIC, "terrainItem", ottoItemTypeNames, allOttoLevels, "src/Terrain/Terrain2.c", {
    ...ottoModelLevelOverrides,
    58: {
      levelNumbers: [3, 7],
      strategy: "level-specific-model",
      source: "src/Items/ZipLine.c:198",
      reason: "Zip-line posts use the Apocalypse model at level 3 and the Fire/Ice model at level 7.",
    },
    76: { levelNumbers: [4], strategy: "level-specific-model", source: "src/Items/BumperCar.c:161", reason: "Bumper cars use the Cloud level-specific model group." },
    80: { levelNumbers: [4], strategy: "level-specific-model", source: "src/Items/BumperCar.c:915", reason: "Bumper-car power posts use the Cloud level-specific model group." },
    82: { levelNumbers: [4], strategy: "level-specific-model", source: "src/Items/BumperCar.c:1206", reason: "Bumper-car gates use the Cloud level-specific model group." },
  }),
  ...createBindings(Game.OTTO_MATIC, "splineItem", ottoSplineItemTypeNames, allOttoLevels, "src/Terrain/SplineItems.c", ottoModelLevelOverrides),
  ...createBindings(Game.BUGDOM, "terrainItem", bugdomItemTypeNames, allBugdomLevels, "src/Terrain/Terrain2.c", {
    4: { strategy: "level-specific-model", source: "src/Items/Items.c", reason: "Rocks select level-specific model groups and variants." },
    6: { strategy: "level-specific-model", source: "src/Items/Items.c", reason: "Grass selects level-specific model groups and variants." },
    33: { strategy: "level-specific-model", source: "src/Items/Items.c", reason: "The lawn door selects a level-specific model group." },
  }),
  ...createBindings(Game.BUGDOM, "splineItem", bugdomSplineItemTypeNames, allBugdomLevels, "src/Terrain/SplineItems.c"),
  ...createBindings(Game.BUGDOM_2, "terrainItem", bugdom2ItemTypeNames, allBugdom2Levels, "Source/Terrain/Terrain2.c", {
    2: { levelNumbers: [0, 1], strategy: "level-aware-behavior", source: "Source/Items/Traps.c:89", reason: "The sprinkler uses Garden or Sidewalk level-specific models." },
    11: { levelNumbers: bugdom2Garden, strategy: "level-specific-model", source: "Source/Items/Snails.c:803", reason: "The scarecrow uses Garden level-specific models." },
    13: { levelNumbers: bugdom2DoorLevels, strategy: "level-aware-behavior", source: "Source/Items/Items.c:362", reason: "Doors have level-specific models on Garden, Sidewalk, Playroom, Closet, Garbage, and Park." },
    14: { levelNumbers: [1, 3], strategy: "level-aware-behavior", source: "Source/Items and Source/Terrain dispatch tables", reason: "Ride-ball models are available on Sidewalk and Playroom." },
    15: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/Snails.c:1097", reason: "Bowling marbles use Playroom level-specific models." },
    16: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/Snails.c:1320", reason: "Bowling pins use Playroom level-specific models." },
    17: { levelNumbers: [0, 1], strategy: "level-aware-behavior", source: "Source/Items/Items.c:513", reason: "Bricks select Garden or Sidewalk level-specific models." },
    18: { levelNumbers: [0, 1, 3, 6, 8], strategy: "level-aware-behavior", source: "Source/Items/Items.c:558", reason: "Posts select Garden, Sidewalk, Playroom, Garbage, or Park level-specific models." },
    21: { levelNumbers: [0, 1], strategy: "level-aware-behavior", source: "Source/Items/Items.c:621", reason: "Pebbles select Garden or Sidewalk level-specific models." },
    23: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Items.c:667", reason: "Pool coping uses Sidewalk level-specific models." },
    24: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Items.c:739", reason: "Pool leaves use Sidewalk level-specific models." },
    26: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Snails.c:1610", reason: "Squish berries use Sidewalk level-specific models." },
    27: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Items.c:885", reason: "Dog houses use Sidewalk level-specific models." },
    28: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Traps.c:297", reason: "Windmills use Sidewalk level-specific models." },
    30: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Items.c:937", reason: "Tulip pots use Sidewalk level-specific models." },
    31: { levelNumbers: [1, 3], strategy: "level-aware-behavior", source: "Source/Items/Items.c:969", reason: "Beach balls select Sidewalk or Playroom level-specific models." },
    32: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Items.c:1061", reason: "Chlorine floats use Sidewalk level-specific models." },
    33: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Items.c:1128", reason: "Pool-ring floats use Sidewalk level-specific models." },
    34: { levelNumbers: bugdom2Sidewalk, strategy: "level-specific-model", source: "Source/Items/Items.c:1189", reason: "Drain pipes use Sidewalk level-specific models." },
    35: { strategy: "level-aware-behavior", source: "Source/Items/Powerups.c:577", reason: "Power-ups use global models with level-specific Closet and Balsa behavior." },
    37: { levelNumbers: [1, 8], strategy: "level-aware-behavior", source: "Source/Items/Items.c:1244", reason: "Glass bottles select Sidewalk or Park level-specific models." },
    41: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/Items2.c:50", reason: "Letter blocks use Playroom level-specific models." },
    44: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/SlotCar.c:865", reason: "The finish line uses Playroom level-specific models." },
    46: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/Snails2.c:49", reason: "Puzzles use Playroom level-specific models." },
    47: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/Items2.c:368", reason: "Lego walls use Playroom level-specific models." },
    48: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Items2.c:447", reason: "Flashlights use Closet level-specific models." },
    49: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/Items2.c:652", reason: "D-cells use Playroom level-specific models." },
    50: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/Items2.c:542", reason: "Crayons use Playroom level-specific models." },
    55: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Items2.c:688", reason: "Cardboard boxes use Closet level-specific models." },
    56: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Items2.c:1081", reason: "Trampolines use Closet level-specific models." },
    57: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Pickups.c:431", reason: "Moth balls use Closet level-specific models." },
    59: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Items2.c:775", reason: "Closet walls use Closet level-specific models." },
    62: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Pickups.c:678", reason: "Silicon parts use Closet level-specific models." },
    64: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Items2.c:811", reason: "Book stacks use Closet level-specific models." },
    66: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Items2.c:733", reason: "Shoe boxes use Closet level-specific models." },
    67: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Items2.c:1118", reason: "Picture frames use Closet level-specific models." },
    70: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/Items2.c:1149", reason: "Lily pads use Park level-specific models." },
    71: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/Items2.c:1207", reason: "Cat tails use Park level-specific models." },
    73: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/Items2.c:1238", reason: "Platform flowers use Park level-specific models." },
    74: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/Snails2.c:381", reason: "Fishing lures use Park level-specific models." },
    75: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/Items2.c:1296", reason: "Silverware uses Park level-specific models." },
    76: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/Snails2.c:506", reason: "Picnic baskets use Park level-specific models." },
    77: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/BeeHive.c:234", reason: "Kindling uses Park level-specific models." },
    78: { levelNumbers: bugdom2Park, strategy: "level-specific-model", source: "Source/Items/BeeHive.c:49", reason: "Bee hives use Park level-specific models." },
    79: { levelNumbers: bugdom2Garbage, strategy: "level-specific-model", source: "Source/Items/Items3.c:59", reason: "Soda cans use Garbage level-specific models." },
    80: { levelNumbers: bugdom2Garbage, strategy: "level-specific-model", source: "Source/Items/Items3.c:359", reason: "Veggies use Garbage level-specific models." },
    81: { levelNumbers: bugdom2Garbage, strategy: "level-specific-model", source: "Source/Items/Items3.c:406", reason: "Jars use Garbage level-specific models." },
    82: { levelNumbers: bugdom2Garbage, strategy: "level-specific-model", source: "Source/Items/Items3.c:454", reason: "Tin cans use Garbage level-specific models." },
    83: { levelNumbers: bugdom2Garbage, strategy: "level-specific-model", source: "Source/Items/Items3.c:513", reason: "Detergent uses Garbage level-specific models." },
    84: { levelNumbers: bugdom2Garbage, strategy: "level-specific-model", source: "Source/Items/Items3.c:556", reason: "Box walls use Garbage level-specific models." },
    85: { levelNumbers: bugdom2Garbage, strategy: "level-specific-model", source: "Source/Items/Items3.c:599", reason: "Glider parts use Garbage level-specific models." },
  }),
  ...createBindings(Game.BUGDOM_2, "splineItem", bugdom2SplineItemTypeNames, allBugdom2Levels, "Source/Terrain/SplineItems.c", {
    40: { levelNumbers: bugdom2Playroom, strategy: "level-specific-model", source: "Source/Items/SlotCar.c:85", reason: "Slot cars use Playroom level-specific models." },
    58: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Traps.c:1236", reason: "Vacuums use Closet level-specific models." },
    63: { levelNumbers: bugdom2Closet, strategy: "level-specific-model", source: "Source/Items/Snails2.c:236", reason: "Hangers use Closet level-specific models." },
  }),
  ...createBindings(Game.NANOSAUR, "terrainItem", nanosaurItemTypeNames, allNanosaurLevels, "src/Terrain/Terrain2.c"),
  ...createBindings(Game.NANOSAUR_2, "terrainItem", nanosaur2ItemTypeNames, allNanosaur2Levels, "Source/Terrain/Terrain2.c", {
    1: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Birch trees use Forest level-specific models." },
    2: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Pine trees use Forest level-specific models." },
    5: { levelNumbers: nanosaur2AdventureLevels, strategy: "level-specific-model", source: "Source/Items/Turret.c", reason: "Tower-turret model groups vary across the three adventure levels." },
    7: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Small trees use Forest level-specific models." },
    8: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Fallen trees use Forest level-specific models." },
    9: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Tree stumps use Forest level-specific models." },
    10: { levelNumbers: nanosaur2AdventureLevels, strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Grass model groups vary across the three adventure levels." },
    11: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Ferns use Forest level-specific models." },
    12: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Berry bushes use Forest level-specific models." },
    13: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Cat tails use Forest level-specific models." },
    14: { levelNumbers: nanosaur2AdventureLevels, strategy: "level-specific-model", source: "Source/Items/Rocks.c", reason: "Rock model groups vary across the three adventure levels." },
    17: { levelNumbers: nanosaur2AdventureLevels, strategy: "level-specific-model", source: "Source/Items/Mines.c", reason: "Air-mine model groups vary across the three adventure levels." },
    18: { levelNumbers: nanosaur2AdventureLevels, strategy: "level-specific-model", source: "Source/Items/ForestDoor.c", reason: "Forest-door model groups vary across the three adventure levels." },
    19: { levelNumbers: [0, 1, 2], strategy: "level-aware-behavior", source: "Source/Items/ForestDoor.c", reason: "Forest-door keys are part of the adventure door system." },
    23: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Items.c", reason: "River rocks use Forest level-specific models." },
    24: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Items.c", reason: "Gas mounds use Forest level-specific models." },
    25: { levelNumbers: [0], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Bent pine trees use Forest level-specific models." },
    27: { levelNumbers: [1], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Desert trees use Desert level-specific models." },
    28: { levelNumbers: [1], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Desert bushes use Desert level-specific models." },
    29: { levelNumbers: [1], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Cacti use Desert level-specific models." },
    30: { levelNumbers: [1], strategy: "level-specific-model", source: "Source/Items/Crystals.c", reason: "Crystals use Desert level-specific models." },
    31: { levelNumbers: [1], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Palm trees use Desert level-specific models." },
    36: { levelNumbers: [1], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Palm bushes use Desert level-specific models." },
    37: { levelNumbers: [1], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Burnt desert trees use Desert level-specific models." },
    38: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Hydra trees use Swamp level-specific models." },
    39: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Odd trees use Swamp level-specific models." },
    40: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Gecko plants use Swamp level-specific models." },
    41: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Sprout plants use Swamp level-specific models." },
    42: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Bushes.c", reason: "Ivy uses Swamp level-specific models." },
    43: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Items.c", reason: "Asteroids use Swamp level-specific models." },
    44: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Swamp fallen trees use Swamp level-specific models." },
    45: { levelNumbers: [2], strategy: "level-specific-model", source: "Source/Items/Trees.c", reason: "Swamp stumps use Swamp level-specific models." },
  }),
  ...createBindings(Game.NANOSAUR_2, "splineItem", nanosaur2SplineItemTypeNames, allNanosaur2Levels, "Source/Terrain/SplineItems.c"),
  ...createBindings(Game.CRO_MAG, "terrainItem", croMagItemTypeNames, allCroMagTracks, "Source/Terrain/Terrain2.c", {
    4: { levelNumbers: [2, 3, 5, 9, 10, 14], strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Trees have verified track variants; UI track numbers are source track IDs plus one." },
    6: { levelNumbers: [1, 2, 3, 5, 6, 7, 9, 10, 11], strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Finish-line models exist on non-arena tracks with a declared track model." },
    17: { levelNumbers: allCroMagTracks, strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Campfire selection is track-aware and uses the track's level-specific model group." },
    20: { levelNumbers: [1, 5, 7, 10, 11, 15], strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Pillar variants exist only for tracks with a matching source option table." },
    22: { levelNumbers: [5, 7, 10, 11], strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Boat variants exist only on tracks with a matching source option." },
    24: { levelNumbers: [5, 7], strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "Statue variants exist on Crete and Egypt." },
    39: { levelNumbers: [2, 3, 5, 6, 9, 10, 11], strategy: "track-specific-model", source: "Source/Terrain/Items.c", reason: "House variants exist only on tracks with a matching source option table." },
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
