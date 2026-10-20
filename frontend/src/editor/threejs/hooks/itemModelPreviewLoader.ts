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

export interface ItemModelLoadError {
  readonly kind: "unmapped" | "fetch" | "conversion" | "extraction";
  readonly message: string;
}

export interface LoadedItemModel {
  readonly scene: Group;
  readonly resolved: ResolvedItemModelPreview;
}

export const GAME_BASE_PATHS: Record<Game, string> = {
  [Game.OTTO_MATIC]: `${import.meta.env.BASE_URL}games/ottomatic`,
  [Game.BUGDOM]: `${import.meta.env.BASE_URL}games/bugdom1`,
  [Game.BUGDOM_2]: `${import.meta.env.BASE_URL}games/bugdom2`,
  [Game.NANOSAUR]: `${import.meta.env.BASE_URL}games/nanosaur1`,
  [Game.NANOSAUR_2]: `${import.meta.env.BASE_URL}games/nanosaur2`,
  [Game.CRO_MAG]: `${import.meta.env.BASE_URL}games/cromagrally`,
  [Game.BILLY_FRONTIER]: `${import.meta.env.BASE_URL}games/billyfrontier`,
  [Game.MIGHTY_MIKE]: `${import.meta.env.BASE_URL}games/mightymike`,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "The item model could not be loaded.";
}

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
  return ResultAsync.fromPromise(
    Promise.all(sources.map(async (source) => {
      const modelSource = source ?? mapping;
      const url = `${GAME_BASE_PATHS[request.game]}/${modelSource.modelPath}/${modelSource.modelFile}`;
      const gltf = await loadFileGltf(worker, url);
      return extractSubgroupByIndex(gltf, modelSource.modelIndex, modelSource.groupSize ?? 1);
    })),
    (error): ItemModelLoadError => ({ kind: "conversion", message: errorMessage(error) }),
  ).andThen((parts) => {
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
