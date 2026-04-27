import { ok, type Result } from "neverthrow";
import type { DecodedTerrainTile } from "@/data/terrain-io/terrainCodecTypes";
import type { TerrainIoError } from "@/data/terrain-io/terrainIoErrors";

export function assembleTerrainCanvases(
  decodedTiles: DecodedTerrainTile[],
): Result<HTMLCanvasElement[], TerrainIoError> {
  const sortedTiles = [...decodedTiles].sort(
    (left, right) => left.id - right.id,
  );
  const canvases = sortedTiles.map((tile) => {
    const canvas = document.createElement("canvas");
    canvas.width = tile.imageData.width;
    canvas.height = tile.imageData.height;
    const context = canvas.getContext("2d");
    if (context) {
      context.putImageData(tile.imageData, 0, 0);
    }
    return canvas;
  });

  return ok(canvases);
}
