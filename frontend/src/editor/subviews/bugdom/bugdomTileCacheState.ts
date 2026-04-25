import { TILENUM_MASK } from "@/editor/subviews/bugdom/BugdomTileRenderer.utils";

export function isLikelyInvalidBugdomLayrData(layerData: number[]): boolean {
  return (
    layerData.length > 100 &&
    layerData[0] === 0 &&
    layerData[1] === 1 &&
    layerData[2] === 2 &&
    layerData[3] === 3
  );
}

export function getMaxTileIndex(layerData: number[]): number {
  return Math.max(
    ...layerData.slice(0, 100).map((value) => value & TILENUM_MASK),
  );
}

export function getExpectedLayrLength(
  mapWidth: number,
  mapHeight: number,
): number {
  return mapWidth * mapHeight;
}

export function getChangedSupertiles(
  previousLayer: number[],
  nextLayer: number[],
  mapWidth: number,
  tilesPerSupertile: number,
): Set<number> {
  const changed = new Set<number>();
  const supertilesWide = Math.ceil(mapWidth / tilesPerSupertile);

  for (let index = 0; index < nextLayer.length; index += 1) {
    if (nextLayer[index] === previousLayer[index]) {
      continue;
    }

    const row = Math.floor(index / mapWidth);
    const col = index % mapWidth;
    const stRow = Math.floor(row / tilesPerSupertile);
    const stCol = Math.floor(col / tilesPerSupertile);
    changed.add(stRow * supertilesWide + stCol);
  }

  return changed;
}
