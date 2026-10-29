import { err, ok, ResultAsync } from "neverthrow";
import { Box3, Group } from "three";
import { Game } from "@/data/globals/globals";
import {
  resolveItemModelPreview,
  type ItemModelPreviewRequest,
  type ResolvedItemModelPreview,
} from "@/data/items/itemModelPreview";
import { getGameMapper } from "@/data/items/mappers";
import {
  cloneGroupForItemRendering,
  extractSubgroupByIndex,
  loadFileGltf,
} from "./itemModelLoaderUtils";
import { applyModelPartLocalTransform } from "../itemModelPresentation";
import { gameAssetBase } from "@/assets/gameAssetUrls";

export interface ItemModelLoadError {
  readonly kind: "unmapped" | "fetch" | "conversion" | "extraction";
  readonly message: string;
}

export interface LoadedItemModel {
  readonly scene: Group;
  readonly resolved: ResolvedItemModelPreview;
}

export const GAME_BASE_PATHS: Record<Game, string> = {
  [Game.OTTO_MATIC]: gameAssetBase(Game.OTTO_MATIC),
  [Game.BUGDOM]: gameAssetBase(Game.BUGDOM),
  [Game.BUGDOM_2]: gameAssetBase(Game.BUGDOM_2),
  [Game.NANOSAUR]: gameAssetBase(Game.NANOSAUR),
  [Game.NANOSAUR_2]: gameAssetBase(Game.NANOSAUR_2),
  [Game.CRO_MAG]: gameAssetBase(Game.CRO_MAG),
  [Game.BILLY_FRONTIER]: gameAssetBase(Game.BILLY_FRONTIER),
  [Game.MIGHTY_MIKE]: gameAssetBase(Game.MIGHTY_MIKE),
};

export function loadResolvedItemModel(
  request: ItemModelPreviewRequest,
  worker: Worker,
): ResultAsync<LoadedItemModel, ItemModelLoadError> {
  const resolution = resolveItemModelPreview(request, getGameMapper(request.game));
  if (resolution.kind === "unmapped") {
    return ResultAsync.fromSafePromise(
      Promise.resolve(err<LoadedItemModel, ItemModelLoadError>({
        kind: "unmapped",
        message: `No ${request.kind} mapping exists for item ${request.itemType}.`,
      })),
    ).andThen((result) => result);
  }

  const { mapping } = resolution.value;
  const sources = mapping.modelParts && mapping.modelParts.length > 0
    ? mapping.modelParts
    : [undefined];
  return ResultAsync.combine(
    sources.map((source) => {
      const modelSource = source ?? mapping;
      const url = `${GAME_BASE_PATHS[request.game]}/${modelSource.modelPath}/${modelSource.modelFile}`;
      return loadFileGltf(worker, url).map((gltf) => extractSubgroupByIndex(gltf, modelSource.modelIndex, modelSource.groupSize ?? 1));
    }),
  ).mapErr((error): ItemModelLoadError => ({ kind: "conversion", message: error.message })).andThen((parts) => {
    if (parts.some((part) => part === null)) {
      return err<LoadedItemModel, ItemModelLoadError>({
        kind: "extraction",
        message: `Could not extract one or more model parts for ${mapping.modelFile}.`,
      });
    }
    const scene = new Group();
    const renderedParts: Group[] = [];
    parts.forEach((part, index) => {
      if (!part) return;
      const renderedPart = cloneGroupForItemRendering(part);
      const partMapping = sources[index];
      if (partMapping && mapping.modelParts) {
        applyModelPartLocalTransform(renderedPart, partMapping, mapping);
        if (partMapping.positionAnchor === "primary-top") {
          const primary = renderedParts[0];
          if (primary) {
            const primaryBounds = new Box3().setFromObject(primary);
            renderedPart.position.y = primaryBounds.max.y;
          }
        }
      }
      renderedParts.push(renderedPart);
      scene.add(renderedPart);
    });
    return ok<LoadedItemModel, ItemModelLoadError>({ scene, resolved: resolution.value });
  });
}
