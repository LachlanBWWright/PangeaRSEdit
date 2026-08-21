import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import type { GameItemModelMapper } from "./itemModelTypes";
import { resolveItemModelPreview } from "./itemModelPreview";
import { getItemModelCacheKey } from "@/editor/threejs/hooks/itemModelCacheKey";

function mapperFor(getMapping: GameItemModelMapper["getMapping"]): GameItemModelMapper {
  return {
    game: Game.OTTO_MATIC,
    getMapping,
    getMappedTypes: () => [4],
    hasModel: () => true,
    getMappingCount: () => 1,
  };
}

describe("item model preview resolution", () => {
  it("passes kind, level, params, and flags to the mapper", () => {
    const calls: unknown[][] = [];
    const mapper = mapperFor((...args) => {
      calls.push(args);
      return { modelFile: "model.bg3d", modelPath: "models", modelIndex: 2 };
    });
    const result = resolveItemModelPreview({
      game: Game.OTTO_MATIC,
      kind: "splineItem",
      itemType: 4,
      levelNum: 7,
      params: { p0: 1, p1: 2, p2: 3, p3: 4 },
      flags: 8,
    }, mapper);

    expect(result.kind).toBe("resolved");
    expect(calls[0]).toEqual([4, 7, { p0: 1, p1: 2, p2: 3, p3: 4 }, 8, "splineItem"]);
  });

  it("returns a typed unmapped result", () => {
    const mapper = mapperFor(() => undefined);
    const result = resolveItemModelPreview({ game: Game.OTTO_MATIC, kind: "terrainItem", itemType: 99 }, mapper);
    expect(result.kind).toBe("unmapped");
  });

  it("keeps terrain and spline cache keys distinct", () => {
    const terrainKey = getItemModelCacheKey(Game.OTTO_MATIC, 4, undefined, undefined, "terrainItem");
    const splineKey = getItemModelCacheKey(Game.OTTO_MATIC, 4, undefined, undefined, "splineItem");
    expect(terrainKey).not.toBe(splineKey);
  });
});
