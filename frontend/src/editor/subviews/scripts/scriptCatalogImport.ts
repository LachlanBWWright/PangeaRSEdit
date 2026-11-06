import { err, ok, type Result } from "neverthrow";
import type { Game } from "@/data/globals/globals";
import type { GameModel } from "@/components/GameModelSelector";
import { loadCustomThumbnailBytes } from "../items/customItemThumbnailSource";
import { catalogAssetPath } from "./scriptGameModelCatalog";
import { addScriptAsset, updateCustomObjectDefinition, type ScriptCustomObjectDefinition, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { validateScriptWorkspaceAssetsAsync } from "./scriptAssetValidation";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parse3DMF } from "@/modelParsers/parse3dmf";
import { parseBG3DWithSkeleton } from "@/modelParsers/bg3dWithSkeleton";
import { nativeModelObjectCount } from "./scriptNativeModelObjects";
import type { ObjectAnimationClip } from "./scriptAnimationMappings";

export interface CatalogAsset {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sourceName: string;
}

export interface LoadedCatalogModel {
  readonly assets: readonly CatalogAsset[];
  readonly count: number;
  readonly clips: readonly ObjectAnimationClip[];
}

export async function readCatalogModel(assets: readonly CatalogAsset[]): Promise<Result<LoadedCatalogModel, string>> {
  const model = assets[0];
  if (!model) return err("The catalog model is missing.");
  const buffer = Uint8Array.from(model.bytes).buffer;
  const skeleton = assets[1];
  const parsed = skeleton ? await parseBG3DWithSkeleton(buffer, Uint8Array.from(skeleton.bytes).buffer)
    : model.path.toLowerCase().endsWith(".3dmf") ? parse3DMF(buffer) : parseBG3D(buffer);
  return parsed.map((value) => ({ assets, count: skeleton ? 1 : nativeModelObjectCount(value),
    clips: value.skeleton?.animations.map((animation, index) => ({ name: animation.name || `Animation ${index + 1}`, index })) ?? [] }));
}

export async function loadCatalogModel(game: Game, model: GameModel): Promise<Result<LoadedCatalogModel, string>> {
  const loaded = await loadCatalogAssets(game, model);
  return loaded.isErr() ? err(loaded.error) : readCatalogModel(loaded.value);
}

export async function loadCatalogAssets(game: Game, model: GameModel): Promise<Result<readonly CatalogAsset[], string>> {
  const paths = [model.bg3dFile, ...(model.skeletonFile ? [model.skeletonFile] : [])];
  const assets: CatalogAsset[] = [];
  for (const url of paths) {
    const path = catalogAssetPath(url);
    const loaded = await loadCustomThumbnailBytes(game, path, {});
    if (loaded.isErr()) return err(loaded.error);
    assets.push({ path, bytes: new Uint8Array(loaded.value), sourceName: path.split("/").at(-1) ?? model.name });
  }
  return ok(assets);
}

export async function prepareCatalogImport(workspace: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition, model: GameModel,
  assets: readonly CatalogAsset[], index: number): Promise<Result<(state: ScriptWorkspaceState) => ScriptWorkspaceState, string>> {
  const directory = model.skeletonFile ? "skeletons" : "models";
  const imported = assets.map((asset) => ({ ...asset, path: `Data/Scripts/assets/${directory}/catalog-${asset.sourceName.toLowerCase()}` }));
  const modelAsset = imported[0];
  const skeleton = imported[1];
  if (!modelAsset || (model.skeletonFile && !skeleton)) return err("Load the model and its skeleton before copying it.");
  const scale = definition.visual.kind === "none" ? 1 : definition.visual.scale;
  const common = { scale, slot: 450 };
  const next: ScriptCustomObjectDefinition = { ...definition, assetId: undefined, assetAnimations: undefined,
    visual: skeleton
      ? { ...common, kind: "customSkeleton", modelPath: modelAsset.path, skeletonPath: skeleton.path.replace(/\.rsrc$/i, ""), animations: { idle: 0 }, initialAnimation: "idle", animationSpeed: 1 }
      : { ...common, kind: "customDisplayGroup", modelPath: modelAsset.path, modelObject: index } };
  const paths = new Set(imported.map((asset) => asset.path));
  const importedSize = imported.reduce((size, asset) => size + asset.bytes.byteLength, 0);
  const retainedSize = Object.values(workspace.assets).filter((asset) => !paths.has(asset.path)).reduce((size, asset) => size + asset.bytes.byteLength, 0);
  if (retainedSize + importedSize > 64 * 1024 * 1024) return err("This package would exceed its 64 MiB asset budget. Remove unused assets first.");
  const valid = await validateScriptWorkspaceAssetsAsync({ context: workspace.context, customObjects: [next], assets: Object.fromEntries(imported.map((asset) => [asset.path, asset])) });
  if (valid.isErr()) return err(valid.error);
  const parsed = await readCatalogModel(assets);
  if (parsed.isErr()) return err(parsed.error);
  return ok((state) => {
    const current = state.customObjects.find((entry) => entry.id === definition.id);
    if (!current || current.visual !== definition.visual) return state;
    const total = Object.values(state.assets).filter((asset) => !paths.has(asset.path)).reduce((size, asset) => size + asset.bytes.byteLength, 0)
      + imported.reduce((size, asset) => size + asset.bytes.byteLength, 0);
    if (total > 64 * 1024 * 1024) return { ...state, statusLog: [...state.statusLog, "Model copy exceeds the 64 MiB package budget. Remove unused assets first."] };
    let result = state;
    for (const asset of imported) result = addScriptAsset(result, asset.path, asset.bytes, asset.sourceName);
    return updateCustomObjectDefinition(result, { ...current, visual: next.visual, assetId: undefined, assetAnimations: undefined });
  });
}
