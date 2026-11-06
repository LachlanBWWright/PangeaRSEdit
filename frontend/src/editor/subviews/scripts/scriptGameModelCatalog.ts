import { GAME_ASSET_CATALOG } from "@pangea/desktop-contracts";
import { GAMES } from "@/data/games";
import type { GameModel } from "@/components/GameModelSelector";
import type { Game } from "@/data/globals/globals";
import { desktopGameId, DESKTOP_GAMES } from "@/platform/desktop/games";
import { getGameMapper } from "@/data/items/mappers";
import { getItemName } from "@/data/items/getItemNames";
import { getClassicNativeBank, classicSkeletonNames } from "./scriptClassicNativeBanks";
import { modernModelBank } from "./scriptModernModelBanks";
import { modernSkeletonNames } from "./scriptModernSkeletonAvailability";
import { getNativeModelAvailability, nativeModelOverrides } from "./scriptNativeModelAvailability";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

export function gameModelCatalog(game: Game): readonly GameModel[] {
  const id = GAME_ASSET_CATALOG[desktopGameId(game)].game;
  return GAMES.find((entry) => entry.id === id)?.models ?? [];
}

export function catalogAssetPath(url: string): string {
  return url.replace(/^.*\/(models|skeletons)\//i, (_, directory: string) => directory.toLowerCase() === "models" ? "Models/" : "Skeletons/");
}

export function catalogObjectLabel(game: Game, model: GameModel, index: number): string {
  if (model.skeletonFile) return model.name;
  const mapper = getGameMapper(game);
  const globals = DESKTOP_GAMES.find((entry) => entry.globals.GAME_TYPE === game)?.globals;
  const file = model.bg3dFile.split("/").at(-1)?.toLowerCase();
  const type = mapper?.getMappedTypes().find((type) => {
    const mapping = mapper.getMapping(type);
    return mapping !== undefined && !mapping.requiresSkeleton && mapping.modelFile.toLowerCase() === file && mapping.modelIndex === index;
  });
  return type !== undefined && globals ? getItemName(globals, type) : `Object ${index + 1}`;
}

export function catalogNativeDefinition(game: Game, level: number | null, model: GameModel, index: number,
  definition: ScriptCustomObjectDefinition, metadata?: Readonly<Record<string, string>>): ScriptCustomObjectDefinition | null {
  const scale = definition.visual.kind === "none" ? 1 : definition.visual.scale;
  const common = { scale, slot: 450 };
  if (model.skeletonFile) {
    const name = model.skeletonFile.split("/").at(-1)?.replace(/\.skeleton\.rsrc$/i, "").toLowerCase();
    const names = [...modernSkeletonNames(game), ...classicSkeletonNames(game)];
    const skeletonType = names.findIndex((entry) => entry.toLowerCase() === name);
    if (skeletonType < 0) return null;
    const next: ScriptCustomObjectDefinition = { ...definition, assetId: undefined, assetAnimations: undefined,
      visual: { ...common, kind: "nativeSkeleton", skeletonType, initialAnimation: 0, animationSpeed: 1 } };
    return level === null || getNativeModelAvailability(game, next, level, metadata)?.status === "Available" ? next : null;
  }
  const file = model.bg3dFile.split("/").at(-1)?.toLowerCase();
  const groups: readonly ("global" | "levelSpecific")[] = ["global", "levelSpecific"];
  for (const group of groups) {
    if (level === null && group === "levelSpecific") continue;
    const bank = modernModelBank(game, group, level ?? 0, nativeModelOverrides(metadata))?.file ?? getClassicNativeBank(game, group, level ?? 0);
    if (bank?.toLowerCase() !== file) continue;
    const next: ScriptCustomObjectDefinition = { ...definition, assetId: undefined, assetAnimations: undefined,
      visual: { ...common, kind: "nativeDisplayGroup", group, modelObject: index } };
    return getNativeModelAvailability(game, next, level ?? 0, metadata)?.status === "Available" ? next : null;
  }
  return null;
}

export function selectedCatalogModel(game: Game, level: number | null, definition: ScriptCustomObjectDefinition,
  metadata?: Readonly<Record<string, string>>): GameModel | undefined {
  const visual = definition.visual;
  const catalog = gameModelCatalog(game);
  if (visual.kind === "nativeSkeleton") {
    const name = [...modernSkeletonNames(game), ...classicSkeletonNames(game)][visual.skeletonType]?.toLowerCase();
    if (!name) return undefined;
    return catalog.find((model) => model.skeletonFile?.split("/").at(-1)?.replace(/\.skeleton\.rsrc$/i, "").toLowerCase() === name);
  }
  if (visual.kind === "nativeDisplayGroup") {
    if (level === null && visual.group === "levelSpecific") return undefined;
    const file = modernModelBank(game, visual.group, level ?? 0, nativeModelOverrides(metadata))?.file
      ?? getClassicNativeBank(game, visual.group, level ?? 0);
    return catalog.find((model) => !model.skeletonFile && model.bg3dFile.split("/").at(-1)?.toLowerCase() === file?.toLowerCase());
  }
  if (visual.kind === "customDisplayGroup" || visual.kind === "customSkeleton") {
    const file = visual.modelPath.split("/").at(-1)?.replace(/^catalog-/, "").toLowerCase();
    return catalog.find((model) => model.bg3dFile.split("/").at(-1)?.toLowerCase() === file);
  }
  return undefined;
}
