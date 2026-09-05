import { DataType, Game } from "@/data/globals/globals";
import type { AnyLevelInfo } from "@/editor/utils/gamePortConfig";
import { getRuntimeMetadataRules, type MetadataRule } from "./levelMetadataRules";

export interface LevelMetadataDetails {
  readonly identityLabel: string;
  readonly identityValue: string;
  readonly family: string;
  readonly startPolicy: string;
  readonly nativeSystems: string;
  readonly contextFields: readonly MetadataField[];
  readonly runtimeRules: readonly MetadataRule[];
  readonly specialRules: readonly string[];
}

export interface MetadataField {
  readonly label: string;
  readonly value: string;
}

export function getDataTypeLabel(dataType: DataType): string {
  switch (dataType) {
    case DataType.STANDARD:
      return "Standard terrain resource";
    case DataType.TRT_FILE:
      return "Nanosaur terrain (.trt/.ter)";
    case DataType.RSRC_FORK:
      return "Resource-fork terrain";
    case DataType.MIGHTY_MIKE:
      return "Mighty Mike map/tileset";
    default:
      return "Unknown format";
  }
}

function getDetailsForGame(
  game: Game,
  levelIndex: number,
): Omit<LevelMetadataDetails, "identityValue" | "runtimeRules"> {
  switch (game) {
    case Game.OTTO_MATIC:
      return {
        identityLabel: "Level number",
        family: "Level-specific 3D world",
        startPolicy: "Terrain player-start item",
        nativeSystems: "Terrain, fences, water, items, and splines",
        contextFields: [
          { label: "Behavior scope", value: "Level, camera, enemy, transport, and item branches" },
          { label: "Asset scope", value: "Terrain, model, sprite, skeleton, audio, and sky tables" },
        ],
        specialRules: [
          "Enemy, camera, transport, and item behavior can branch by level.",
          "Model, sprite, and sky resources are selected from the level identity.",
        ],
      };
    case Game.BUGDOM:
      return {
        identityLabel: "Real level",
        family: "Derived terrain family and area",
        startPolicy: "Terrain player-start item",
        nativeSystems: "Individual tiles, fences, items, and splines",
        contextFields: [
          { label: "Derived identity", value: "Real level → terrain family → area" },
          { label: "Behavior scope", value: "Enemy, ride, liquid, fence, camera, and trigger branches" },
        ],
        specialRules: [
          "Real level, terrain family, and area are separate runtime concepts.",
          "Enemy, ride, liquid, fence, camera, and trigger behavior can vary by family.",
        ],
      };
    case Game.BUGDOM_2:
      return {
        identityLabel: "Level number",
        family: levelIndex === 3 || levelIndex === 6 ? "Tunnel level" : "Terrain level",
        startPolicy: levelIndex === 3 || levelIndex === 6
          ? "Hard-coded tunnel entry"
          : "Terrain player-start item",
        nativeSystems: "Terrain, fences, water, items, and splines",
        contextFields: [
          { label: "Level family", value: levelIndex === 3 || levelIndex === 6 ? "Plumbing/Gutter tunnel" : "Terrain level" },
          { label: "Asset rule", value: levelIndex === 3 || levelIndex === 6 ? "Tunnel resources; no terrain start" : "Terrain and level model resources" },
        ],
        specialRules: [
          "Item models and several gameplay systems are level-dependent.",
          levelIndex === 3 || levelIndex === 6
            ? "Tunnel levels must not require a terrain start or terrain resource."
            : "Terrain levels resolve the player from a terrain start item.",
        ],
      };
    case Game.NANOSAUR:
      return {
        identityLabel: "Level number",
        family: "Classic single-level terrain",
        startPolicy: "Terrain player-start item",
        nativeSystems: "Individual tiles and items",
        contextFields: [
          { label: "Level scope", value: "Single playable level" },
          { label: "Format scope", value: "Classic terrain metadata and item state" },
        ],
        specialRules: [
          "The original game exposes one playable level identity.",
          "Terrain items carry gameplay state; fences, water, and splines are not native systems.",
        ],
      };
    case Game.NANOSAUR_2:
      return {
        identityLabel: "Level number",
        family: levelIndex < 3
          ? "Adventure"
          : levelIndex < 5
            ? "Race"
            : levelIndex < 7
              ? "Battle"
              : "Capture the Flag",
        startPolicy: "One terrain start per active player",
        nativeSystems: "Terrain, fences, water, items, and splines",
        contextFields: [
          { label: "Mode", value: levelIndex < 3 ? "Adventure" : levelIndex < 5 ? "Race" : levelIndex < 7 ? "Battle" : "Capture the Flag" },
          { label: "Identity dependencies", value: "Biome, map name, terrain, starts, and active-player rules" },
        ],
        specialRules: [
          "The level identity selects the mode, biome, and terrain resource.",
          "Start items and item behavior are filtered by the active multiplayer mode.",
        ],
      };
    case Game.CRO_MAG:
      return {
        identityLabel: "Track number",
        family: levelIndex < 9 ? "Race track" : "Battle track",
        startPolicy: "Mode-filtered terrain or spline starts",
        nativeSystems: "Terrain, fences, water, items, paths, checkpoints, and splines",
        contextFields: [
          { label: "Track kind", value: levelIndex < 9 ? "Race" : "Battle" },
          { label: "Identity dependencies", value: "Track, game mode, vehicle, water, starts, and checkpoints" },
        ],
        specialRules: [
          "Track identity and game mode are independent runtime inputs.",
          "Water, vehicle, checkpoint, start-team, and item behavior can vary by track.",
        ],
      };
    case Game.BILLY_FRONTIER:
      return {
        identityLabel: "Area number",
        family: levelIndex % 6 === 5
          ? "Target practice"
          : levelIndex % 3 === 1
            ? "Shootout"
            : levelIndex % 3 === 0
              ? "Duel"
              : "Stampede",
        startPolicy: "Terrain or spline player-start item",
        nativeSystems: "Terrain, fences, water, items, and splines",
        contextFields: [
          { label: "Area model", value: "Area + mode + completion-slot relationship" },
          { label: "Behavior scope", value: "Initializer, item, target, herd, and completion branches" },
        ],
        specialRules: [
          "Area identity, gameplay mode, and completion slot are separate concepts.",
          "Gameplay mode is the only editable override; assets, environment, difficulty, and progression remain selected by area identity.",
        ],
      };
    case Game.MIGHTY_MIKE:
      return {
        identityLabel: "Scene / area",
        family: `Scene ${String(Math.floor(levelIndex / 3))}, area ${String(levelIndex % 3)}`,
        startPolicy: "Game-specific 2D map setup",
        nativeSystems: "2D map items, tiles, tile animations, and collision attributes",
        contextFields: [
          { label: "Scene index", value: String(Math.floor(levelIndex / 3)) },
          { label: "Area index", value: String(levelIndex % 3) },
        ],
        specialRules: [
          "The playable identity is a scene/area pair, not one native level number.",
          "Sprite, tile, coordinate, trigger, and progression behavior can depend on both values.",
        ],
      };
    default:
      return {
        identityLabel: "Level identity",
        family: "Unknown",
        startPolicy: "Unknown",
        nativeSystems: "Unknown",
        contextFields: [],
        specialRules: ["No game-specific metadata rules are registered."],
      };
  }
}

function getLevelIndexFromInfo(levelInfo: AnyLevelInfo): number {
  if ("trackNumber" in levelInfo) return levelInfo.trackNumber;
  if ("areaNumber" in levelInfo) return levelInfo.areaNumber;
  return levelInfo.levelNumber;
}

export function getLevelMetadataDetails(
  game: Game,
  levelNumber: number | undefined,
  levelInfo: AnyLevelInfo | undefined,
): LevelMetadataDetails {
  const levelIndex = levelNumber ?? (levelInfo ? getLevelIndexFromInfo(levelInfo) : 0);
  const details = getDetailsForGame(game, levelIndex);
  return {
    ...details,
    runtimeRules: getRuntimeMetadataRules(game, levelIndex),
    identityValue: levelInfo?.name ?? (levelNumber === undefined ? "Unknown" : String(levelNumber)),
  };
}
