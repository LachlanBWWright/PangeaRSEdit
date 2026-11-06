import type { LevelData } from "@/python/structSpecs/LevelTypes";

function serializeLiquidNubs(nubs: readonly [number, number][], nubCount: number): Record<string, number> {
  const coordinates: Record<string, number> = {};
  for (let index = 0; index < nubCount; index++) {
    const point = nubs[index];
    coordinates[`x_${index}`] = point?.[0] ?? 0;
    coordinates[`y_${index}`] = point?.[1] ?? 0;
  }
  return coordinates;
}

export function prepareLiquidResources(levelData: LevelData, nubCount: number): LevelData {
  const resource = levelData.Liqd?.[1000];
  if (!resource) return levelData;
  return {
    ...levelData,
    Liqd: {
      ...levelData.Liqd,
      1000: {
        ...resource,
        obj: resource.obj.map((liquid) => ({
          ...liquid,
          ...serializeLiquidNubs(liquid.nubs, nubCount),
        })),
      },
    },
  };
}
