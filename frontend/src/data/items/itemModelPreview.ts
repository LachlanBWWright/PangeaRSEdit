import { Game } from "../globals/globals";
import { getGameMapper } from "./mappers";
import type {
  GameItemModelMapper,
  ItemModelKind,
  UniversalItemModelMapping,
} from "./itemModelTypes";
import { getItemModelCacheKey, type ItemModelParams } from "../../editor/threejs/hooks/itemModelCacheKey";

export interface ItemModelPreviewRequest {
  readonly game: Game;
  readonly kind: ItemModelKind;
  readonly itemType: number;
  readonly levelNum?: number;
  readonly params: ItemModelParams;
  readonly flags?: number;
}

export interface ResolvedItemModelPreview {
  readonly request: ItemModelPreviewRequest;
  readonly cacheKey: string;
  readonly mapping: UniversalItemModelMapping;
}

export type ItemModelMappingResolution =
  | { readonly kind: "resolved"; readonly value: ResolvedItemModelPreview }
  | { readonly kind: "unmapped"; readonly request: ItemModelPreviewRequest };

export const DEFAULT_ITEM_MODEL_PARAMS: ItemModelParams = {
  p0: 0,
  p1: 0,
  p2: 0,
  p3: 0,
};

export function normalizeItemModelPreviewRequest(
  request: Omit<ItemModelPreviewRequest, "params"> &
    Partial<Pick<ItemModelPreviewRequest, "params">>,
): ItemModelPreviewRequest {
  return {
    ...request,
    params: request.params ?? DEFAULT_ITEM_MODEL_PARAMS,
  };
}

export function resolveItemModelPreview(
  requestInput: Omit<ItemModelPreviewRequest, "params"> &
    Partial<Pick<ItemModelPreviewRequest, "params">>,
  mapper: GameItemModelMapper | undefined = getGameMapper(requestInput.game),
): ItemModelMappingResolution {
  const request = normalizeItemModelPreviewRequest(requestInput);
  const mapping = mapper?.getMapping(
    request.itemType,
    request.levelNum,
    request.params,
    request.flags,
    request.kind,
  );
  if (!mapping) return { kind: "unmapped", request };

  return {
    kind: "resolved",
    value: {
      request,
      mapping,
      cacheKey: getItemModelCacheKey(
        request.game,
        request.itemType,
        request.params,
        request.levelNum,
        request.kind,
        request.flags,
      ),
    },
  };
}
