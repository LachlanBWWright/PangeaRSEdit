import { Game } from "@/data/globals/globals";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";

export function hasCeilingHeightData(
  game: Game,
  terrainData: Pick<TerrainData, "YCrd">,
): boolean {
  const ceilingHeights = terrainData.YCrd[1001]?.obj;

  return (
    game === Game.BUGDOM &&
    ceilingHeights !== undefined &&
    ceilingHeights.length > 0
  );
}
