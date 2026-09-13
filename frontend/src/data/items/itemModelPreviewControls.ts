import type { ItemParamDomain, UniversalItemModelMapping } from "./itemModelTypes";
import type { ItemModelParams } from "@/editor/threejs/hooks/itemModelCacheKey";

export type ItemModelParameterKey = "p0" | "p1" | "p2" | "p3" | "flags";

export interface ItemModelParameterControl {
  readonly key: ItemModelParameterKey;
  readonly domain: ItemParamDomain;
  readonly value: number;
}

export function getItemModelParameterControls(
  mapping: UniversalItemModelMapping | undefined,
  params: ItemModelParams,
  flags: number,
): readonly ItemModelParameterControl[] {
  if (!mapping?.paramDomains) return [];
  const values: Record<ItemModelParameterKey, number> = {
    p0: params.p0,
    p1: params.p1,
    p2: params.p2,
    p3: params.p3,
    flags,
  };
  const keys: readonly ItemModelParameterKey[] = ["p0", "p1", "p2", "p3", "flags"];
  return keys.flatMap((key) => {
    const domain = mapping.paramDomains?.[key];
    return domain ? [{ key, domain, value: values[key] }] : [];
  });
}

export function setItemModelBit(
  flags: number,
  bitIndex: number,
  enabled: boolean,
): number {
  const bit = 1 << bitIndex;
  return enabled ? flags | bit : flags & ~bit;
}
