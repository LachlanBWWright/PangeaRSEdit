import { err, ok, type Result } from "neverthrow";
import type { DecodedTerrainTile } from "@/data/terrain-io/terrainCodecTypes";
import {
  terrainIoError,
  type TerrainIoError,
} from "@/data/terrain-io/terrainIoErrors";

export function assembleTerrainCanvases(
  decodedTiles: DecodedTerrainTile[],
): Result<HTMLCanvasElement[], TerrainIoError> {
  if (decodedTiles.length === 0) {
    return err(
      terrainIoError(
        "terrain.decode.bad-format",
        "No terrain tiles were decoded from the texture file",
      ),
    );
  }

  const sortedTiles = [...decodedTiles].sort(
    (left, right) => left.id - right.id,
  );
  const canvases: HTMLCanvasElement[] = [];
  for (const tile of sortedTiles) {
    const canvas = document.createElement("canvas");
    canvas.width = tile.imageData.width;
    canvas.height = tile.imageData.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return err(
        terrainIoError(
          "terrain.decode.no-canvas-context",
          "Failed to get 2D canvas context while assembling terrain textures",
        ),
      );
    }
    context.putImageData(tile.imageData, 0, 0);
    canvases.push(canvas);
  }

  return ok(canvases);
}
