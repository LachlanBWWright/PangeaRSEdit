import { Game } from "@/data/globals/globals";
import { getGameMapper } from "@/data/items/mappers";
import { getParamByIndex } from "@/data/items/standardParamTypes";
import type { ItemModelKind } from "@/data/items/itemModelTypes";

export interface ItemModelParams {
  readonly p0: number;
  readonly p1: number;
  readonly p2: number;
  readonly p3: number;
}

export function getItemModelCacheKey(
  game: Game,
  itemType: number,
  params?: ItemModelParams,
  levelNum?: number,
  kind: ItemModelKind = "terrainItem",
): string {
  const mapper = getGameMapper(game);
  const keyParts = [`g${game}_${kind}_${itemType}`];

  if (levelNum !== undefined && mapper?.isLevelDependent?.(itemType)) {
    keyParts.push(`lv${levelNum}`);
  }

  if (mapper?.isParamDependent?.(itemType) && params) {
    const config = mapper.getParamDependentConfig?.(itemType);
    const paramIndex = config?.paramIndex ?? 1;
    const paramValue = getParamByIndex(params, paramIndex);
    keyParts.push(`p${paramIndex}_${paramValue}`);
  }

  return keyParts.join("_");
}
