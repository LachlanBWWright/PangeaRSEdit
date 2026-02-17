export function getSupertileCounts(
  mapWidth: number,
  mapHeight: number,
  tilesPerSupertile: number,
): { width: number; height: number } {
  return {
    width: Math.ceil(mapWidth / tilesPerSupertile),
    height: Math.ceil(mapHeight / tilesPerSupertile),
  };
}

export function canRemoveSupertileRow(supertileHeight: number): boolean {
  return supertileHeight > 1;
}

export function canRemoveSupertileColumn(supertileWidth: number): boolean {
  return supertileWidth > 1;
}
