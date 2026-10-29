import { Game } from "@/data/globals/globals";
import { getGameMapper } from "@/data/items/mappers";
import { gameAssetBase, gameAssetUrl } from "@/assets/gameAssetUrls";
import { fetchAsset } from "@/assets/fetchAsset";
import { err, ok, type Result } from "neverthrow";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "../scripts/scriptWorkspaceState";
import { getClassicNativeBank, getClassicSkeletonBank } from "../scripts/scriptClassicNativeBanks";
import { modernModelBank } from "../scripts/scriptModernModelBanks";
import { modernSkeletonNames } from "../scripts/scriptModernSkeletonAvailability";
import { nativeModelOverrides } from "../scripts/scriptNativeModelAvailability";

export interface CustomThumbnailSource {
  readonly modelPath: string;
  readonly modelObject: number;
  readonly skeletonPath: string;
  readonly animation: number;
  readonly scale: number;
}

export function customThumbnailSource(game: Game, level: number, definition: ScriptCustomObjectDefinition, metadata?: Readonly<Record<string, string>>): CustomThumbnailSource | null {
  const visual = definition.visual;
  if (visual.kind === "none") return null;
  const base = { modelObject: 0, skeletonPath: "", animation: 0, scale: visual.scale };
  if (visual.kind === "customDisplayGroup") return { ...base, modelPath: visual.modelPath, modelObject: visual.modelObject };
  if (visual.kind === "customSkeleton") return { ...base, modelPath: visual.modelPath, skeletonPath: visual.skeletonPath, animation: visual.animations[visual.initialAnimation] ?? 0 };
  if (visual.kind === "nativeDisplayGroup") {
    const file = modernModelBank(game, visual.group, level, nativeModelOverrides(metadata))?.file ?? getClassicNativeBank(game, visual.group, level);
    return file ? { ...base, modelPath: `${game === Game.MIGHTY_MIKE ? "Shapes" : "Models"}/${file}`, modelObject: visual.modelObject } : null;
  }
  if (visual.kind === "nativeActor") {
    const mapping = getGameMapper(game)?.getMapping(Number(visual.spawnId));
    if (!mapping) return null;
    const modelPath = `${mapping.modelPath}/${mapping.modelFile}`;
    return { ...base, modelPath, modelObject: mapping.modelIndex, skeletonPath: mapping.requiresSkeleton ? modelPath.replace(/\.(bg3d|3dmf)$/i, ".skeleton") : "" };
  }
  const name = modernSkeletonNames(game)[visual.skeletonType] ?? getClassicSkeletonBank(game, visual.skeletonType, level);
  if (!name) return null;
  const modelName = game === Game.BUGDOM_2 && visual.skeletonType < 3 ? "Grasshopper" : name === "StrongMan" ? "Strongman" : name;
  const extension = game === Game.BUGDOM || game === Game.NANOSAUR ? "3dmf" : "bg3d";
  return { ...base, modelPath: `Skeletons/${modelName}.${extension}`, skeletonPath: `Skeletons/${name}.skeleton`, animation: visual.initialAnimation };
}

export async function loadCustomThumbnailBytes(game: Game, path: string, assets: ScriptWorkspaceState["assets"]): Promise<Result<ArrayBuffer, string>> {
  const uploaded = assets[path];
  if (uploaded) return ok(Uint8Array.from(uploaded.bytes).buffer);
  if (path.startsWith("Data/")) return err(`Missing custom asset: ${path}`);
  const browserPath = path.replace(/^[^/]+/, (directory) => directory.toLowerCase());
  const browserUrl = game === Game.MIGHTY_MIKE ? `${import.meta.env.BASE_URL}data/mightymike/${browserPath}` : `${gameAssetBase(game)}/${browserPath}`;
  return fetchAsset(gameAssetUrl(game, path, browserUrl)).mapErr((failure) => failure.message);
}
