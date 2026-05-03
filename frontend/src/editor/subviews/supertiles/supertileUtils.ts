import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";

export const downloadSelectedTile = (
  mapImages: HTMLCanvasElement[],
  superTileId: number,
  tileIndex: number,
) => {
  if (superTileId === 0 || !mapImages[superTileId]) return;

  const tileImage = mapImages[superTileId];
  const link = document.createElement("a");
  link.download = `tile_${tileIndex}.png`;
  link.href = tileImage.toDataURL("image/png");
  link.click();
};

export const downloadMapImage = (
  mapImages: HTMLCanvasElement[],
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: { SUPERTILE_TEXMAP_SIZE: number; TILES_PER_SUPERTILE: number },
) => {
  const hedr = headerData.Hedr[1000].obj;

  const stgd = terrainData.STgd;

  if (!stgd) return;

  if (!stgd[1000].obj) return;

  const canvas = document.createElement("canvas");
  canvas.width =
    globals.SUPERTILE_TEXMAP_SIZE *
    (hedr.mapWidth / globals.TILES_PER_SUPERTILE);
  canvas.height =
    globals.SUPERTILE_TEXMAP_SIZE *
    (hedr.mapHeight / globals.TILES_PER_SUPERTILE);
  const context = canvas.getContext("2d");

  if (!context) return;
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < hedr.mapHeight / globals.TILES_PER_SUPERTILE; i++) {
    for (let j = 0; j < hedr.mapWidth / globals.TILES_PER_SUPERTILE; j++) {
      const tileIndex = i * (hedr.mapWidth / globals.TILES_PER_SUPERTILE) + j;
      const stgdEntry = stgd[1000].obj[tileIndex];
      if (!stgdEntry) continue; // guard against out-of-bounds/undefined
      const superTileId = stgdEntry.superTileId;
      if (superTileId === 0) continue;
      const tileImage = mapImages[superTileId];
      if (!tileImage) continue;
      const dx = j * globals.SUPERTILE_TEXMAP_SIZE;
      const dy = i * globals.SUPERTILE_TEXMAP_SIZE;
      context.drawImage(tileImage, dx, dy);
    }
  }

  const link = document.createElement("a");
  link.download = "map_image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};
