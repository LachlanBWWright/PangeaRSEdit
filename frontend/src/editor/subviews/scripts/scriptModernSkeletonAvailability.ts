import { Game } from "@/data/globals/globals";
import type { NativeModelAvailability } from "./scriptNativeModelAvailability";
import { modernUsesTunnel, type NativeModelBankOverrides } from "./scriptModernModelBanks";

interface SkeletonLoadList {
  readonly names: readonly string[];
  readonly common: readonly number[];
  readonly levels: readonly (readonly number[])[];
}

// Native Skeleton enums and System/File.c or System/LoadLevel.c startup loads.
const otto: SkeletonLoadList = {
  names: ["Otto", "Farmer", "BrainAlien", "Onion", "Corn", "Tomato", "Blob", "SlimeTree", "BeeWoman", "Squooshy", "Flamester", "GiantLizard", "VenusFlytrap", "Mantis", "Turtle", "PodWorm", "Mutant", "MutantRobot", "Scientist", "PitcherPlant", "Clown", "ClownFish", "StrongMan", "SkirtLady", "IceCube", "EliteBrainAlien"],
  common: [0, 1, 2, 8, 18, 23],
  levels: [[3, 4, 5], [6, 7, 9], [], [15, 16, 17], [20, 21, 22], [11, 12, 13, 14], [12, 14, 19], [9, 10, 24], [], [25]],
};

const bugdom2: SkeletonLoadList = {
  names: ["Skip_Explore", "Skip_Tunnel", "Skip_Title", "Snail", "Gnome", "HouseFly", "EvilPlant", "Chipmunk", "SnakeHead", "BuddyBug", "Checkpoint", "Flea", "Tick", "MouseTrap", "Mouse", "Soldier", "OttoToy", "BumbleBee", "HoboBag", "DragonFly", "Frog", "Moth", "ComputerBug", "Roach", "Ant", "Fish"],
  common: [0, 3, 5, 7, 9, 10, 11, 13, 14, 17, 18],
  levels: [[4, 6], [4, 8], [12], [1], [15, 16], [15, 21, 22, 23], [1], [11, 19, 23], [19, 20], [20, 24, 25]],
};

const croMag: SkeletonLoadList = {
  names: ["Brog", "Grag", "BirdBomb", "Yeti", "Beetle", "Camel", "Catapult", "BrontoNeck", "Shark", "Flag", "Pterodactyl", "BrogStanding", "GragStanding", "Dragon", "Mummy", "Troll", "Druid", "PolarBear", "Flower", "Viking"],
  common: [0, 1, 2],
  levels: [[7], [10, 18], [3, 17], [], [13], [4, 5, 14], [6, 9], [15, 19], [8], [16], [], [], [], [9], [], [], []],
};

const billy: SkeletonLoadList = {
  names: ["Billy", "Bandito", "Rygar", "Shorty", "KangaCow", "KangaRex", "Walker", "TremorAlien", "TremorGhost", "FrogMan"],
  common: [],
  levels: [[0, 1, 2, 3], [0, 1, 3, 4, 6], [0, 1, 2, 3], [0, 4], [0, 1, 2, 3], [3, 4], [0, 1, 2, 3], [0, 1, 3, 5, 7, 8, 9], [0, 1, 2, 3], [0, 5], [0, 1, 2, 3], [8, 9]],
};

const nanosaur2: SkeletonLoadList = {
  names: ["nano", "wormhole", "raptor", "bonusworm", "brach", "worm", "ramphor"],
  common: [0, 1, 2, 4],
  levels: [[], [], [5, 6], [5, 6], [], [], [], [5, 6], []],
};

export const MODERN_SKELETON_ANIMATIONS: Readonly<Record<string, number>> = {
  Otto: 35, Farmer: 6, BrainAlien: 8, Onion: 6, Corn: 4, Tomato: 5, Blob: 1, SlimeTree: 1, BeeWoman: 6, Squooshy: 6, Flamester: 3, GiantLizard: 9, VenusFlytrap: 4, Mantis: 6, Turtle: 2, PodWorm: 1, Mutant: 5, MutantRobot: 7, Scientist: 5, PitcherPlant: 3, Clown: 5, ClownFish: 1, StrongMan: 5, SkirtLady: 5, IceCube: 4, EliteBrainAlien: 8,
  Billy: 14, Bandito: 6, Rygar: 3, Shorty: 8, KangaCow: 3, KangaRex: 3, Walker: 7, TremorAlien: 7, TremorGhost: 6, FrogMan: 5,
  Skip_Explore: 36, Skip_Tunnel: 5, Skip_Title: 9, Snail: 2, Gnome: 4, HouseFly: 5, EvilPlant: 5, Chipmunk: 8, SnakeHead: 3, BuddyBug: 1, Checkpoint: 2, Flea: 7, Tick: 8, MouseTrap: 4, Mouse: 3, Soldier: 7, OttoToy: 5, BumbleBee: 2, HoboBag: 4, DragonFly: 3, Frog: 9, Moth: 1, ComputerBug: 3, Roach: 7, Ant: 8, Fish: 4,
  Brog: 9, Grag: 9, BirdBomb: 1, Yeti: 1, Beetle: 1, Camel: 1, Catapult: 2, BrontoNeck: 1, Shark: 1, Flag: 1, Pterodactyl: 1, BrogStanding: 4, GragStanding: 2, Dragon: 1, Mummy: 1, Troll: 1, Druid: 1, PolarBear: 1, Flower: 1, Viking: 1,
  nano: 13, wormhole: 2, raptor: 9, bonusworm: 1, brach: 5, worm: 1, ramphor: 8,
};

export function modernSkeletonNames(game: Game): readonly string[] {
  return loadList(game)?.names ?? [];
}

function loadList(game: Game): SkeletonLoadList | null {
  switch (game) {
    case Game.OTTO_MATIC: return otto;
    case Game.BUGDOM_2: return bugdom2;
    case Game.CRO_MAG: return croMag;
    case Game.BILLY_FRONTIER: return billy;
    case Game.NANOSAUR_2: return nanosaur2;
    default: return null;
  }
}

function levelSkeletons(game: Game, list: SkeletonLoadList, level: number, overrides: NativeModelBankOverrides): readonly number[] {
  if (game === Game.BUGDOM_2) {
    if (modernUsesTunnel(game, level, overrides)) return [1];
    const areaNames = ["gnome-garden", "sidewalk", "fido", "plumbing", "playroom", "closet", "gutter", "garbage", "balsa", "park"];
    const override = areaNames.indexOf(overrides.bugdom2Area ?? "");
    const selected = override >= 0 ? override : level;
    return [...list.common, ...(list.levels[selected] ?? [])];
  }
  if (game === Game.NANOSAUR_2 && ["forest", "desert", "swamp"].includes(overrides.biome ?? "")) return [...list.common, ...(overrides.biome === "swamp" ? [5, 6] : [])];
  if (game === Game.BILLY_FRONTIER && overrides.areaMode && overrides.areaMode !== "source-default") {
    const swamp = level >= 6;
    switch (overrides.areaMode) {
      case "duel": return [0, 1, 2, 3];
      case "shootout": return swamp ? [0, 1, 3, 5, 7, 8, 9] : [0, 1, 3, 4, 6];
      case "stampede": return [0, swamp ? 5 : 4];
      case "target-practice": return level === 5 ? [3, 4] : [8, 9];
    }
  }
  return [...list.common, ...(list.levels[level] ?? [])];
}

export function getModernSkeletonAvailability(game: Game, skeletonType: number, levelNumber: number | null, overrides: NativeModelBankOverrides & { readonly initialAnimation?: number } = {}): NativeModelAvailability | null {
  const list = loadList(game);
  if (!list) return null;
  const name = list.names[skeletonType];
  if (!Number.isInteger(skeletonType) || !name) return { status: "Unavailable", detail: `Skeleton ${skeletonType} is not a built-in skeleton. Use an uploaded skeleton for custom asset slots.` };
  if (levelNumber === null) return { status: "Choose level", detail: `Choose a target level to check when ${name} is loaded.` };
  const level = list.levels[levelNumber];
  if (!Number.isInteger(levelNumber) || !level) return { status: "Unavailable", detail: "The selected native gameplay level does not exist." };
  const animations = MODERN_SKELETON_ANIMATIONS[name] ?? 0;
  const animation = overrides.initialAnimation ?? 0;
  if (!Number.isInteger(animation) || animation < 0 || animation >= animations) return { status: "Unavailable", detail: `${name} has ${animations} animations; the initial animation must be between 0 and ${animations - 1}.` };
  const loaded = levelSkeletons(game, list, levelNumber, overrides).includes(skeletonType);
  const model = game === Game.BUGDOM_2 && skeletonType < 3 ? "Grasshopper" : name === "StrongMan" ? "Strongman" : name;
  const assets = `Skeletons/${name}.skeleton.rsrc and Skeletons/${model}.bg3d`;
  return loaded
    ? { status: "Available", detail: `The native gameplay loader loads ${assets} in this level. This checks the standard level load list; additional script dependencies or level metadata can change loaded assets. Animation and behavior still require testing.` }
    : { status: "Unavailable", detail: `The standard native gameplay loader does not load ${assets} in this level. Upload the assets as a custom skeleton or explicitly add the native skeleton dependency where supported.` };
}

const actorSkeletons = new Map<string, number>([["3", 9], ["7", 2], ["8", 3], ["9", 4], ["10", 5], ["30", 6], ["49", 10], ["50", 11], ["51", 12], ["52", 13], ["59", 16], ["60", 17], ["78", 20], ["81", 22], ["92", 24]]);
const modelActors = new Set(["38", "89", "93", "94", "95"]);
const actorNames = new Map<string, string>([["squooshy", "3"], ["brainAlien", "7"], ["onion", "8"], ["corn", "9"], ["tomato", "10"], ["blob", "30"], ["slimeMech", "38"], ["flamester", "49"], ["giantLizard", "50"], ["flyTrap", "51"], ["mantis", "52"], ["mutant", "59"], ["mutantRobot", "60"], ["clown", "78"], ["strongMan", "81"], ["jawsBot", "89"], ["iceCube", "92"], ["hammerBot", "93"], ["drillBot", "94"], ["swingerBot", "95"]]);

export function getNativeActorAvailability(game: Game, spawnId: string, levelNumber: number | null): NativeModelAvailability {
  if (game !== Game.OTTO_MATIC) return { status: "Unavailable", detail: "Native actor visuals are supported only by Otto Matic." };
  const id = actorNames.get(spawnId.replace(/^ottomatic\./, "")) ?? spawnId;
  const skeleton = actorSkeletons.get(id);
  if (skeleton !== undefined) return getModernSkeletonAvailability(game, skeleton, levelNumber) ?? { status: "Unavailable", detail: "Unknown native actor skeleton." };
  if (!modelActors.has(id)) return { status: "Unavailable", detail: "This spawn is not supported as a native actor visual." };
  if (levelNumber === null) return { status: "Choose level", detail: "Choose a target level to check this actor's model assets." };
  if (!Number.isInteger(levelNumber) || !otto.levels[levelNumber]) return { status: "Unavailable", detail: "The selected native gameplay level does not exist." };
  return { status: "Available", detail: "The editor runtime preloads the native actor's level model bank through safe item loading. Native constructors may still reject spawning because of enemy limits or gameplay conditions." };
}
