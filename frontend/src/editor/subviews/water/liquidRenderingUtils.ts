import { type GlobalsInterface } from "@/data/globals/globals";
import { HeaderData, Liquid, TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  getLiquidTextureCanvas,
  getLiquidVisualStyle,
  type LiquidTextureKind,
  type LiquidVisualStyle,
} from "./liquidTextureHelpers";

interface TerrainHeader {
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  minY: number;
}

const DEFAULT_LIQUID_HEIGHT_OFFSET = 100;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export { getLiquidTextureCanvas, getLiquidVisualStyle };
export type { LiquidTextureKind, LiquidVisualStyle };

function getTerrainSample(
  xTile: number,
  zTile: number,
  header: TerrainHeader,
  yCoords: number[],
) {
  const x = clamp(xTile, 0, header.mapWidth);
  const z = clamp(zTile, 0, header.mapHeight);
  const idx = z * (header.mapWidth + 1) + x;
  return yCoords[idx] ?? header.minY;
}

export function sampleTerrainHeightAtPoint(
  x: number,
  z: number,
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
) {
  const header = headerData.Hedr?.[1000]?.obj;
  const yCoords = terrainData.YCrd?.[1000]?.obj;
  if (!header || !yCoords?.length) return 0;

  const xTileUnits = x / globals.TILE_SIZE;
  const zTileUnits = z / globals.TILE_SIZE;

  const x1 = Math.floor(xTileUnits);
  const z1 = Math.floor(zTileUnits);
  const x2 = Math.ceil(xTileUnits);
  const z2 = Math.ceil(zTileUnits);

  const h11 = getTerrainSample(x1, z1, header, yCoords);
  const h21 = getTerrainSample(x2, z1, header, yCoords);
  const h12 = getTerrainSample(x1, z2, header, yCoords);
  const h22 = getTerrainSample(x2, z2, header, yCoords);

  const dx = x2 - x1;
  const dz = z2 - z1;
  const xFactor = dx === 0 ? 0 : (xTileUnits - x1) / dx;
  const zFactor = dz === 0 ? 0 : (zTileUnits - z1) / dz;

  const interpolatedHeight =
    h11 * (1 - xFactor) * (1 - zFactor) +
    h21 * xFactor * (1 - zFactor) +
    h12 * (1 - xFactor) * zFactor +
    h22 * xFactor * zFactor;

  const yScale = globals.TILE_INGAME_SIZE / header.tileSize;
  return interpolatedHeight * yScale;
}

export function getLiquidCoverageOpacity(
  liquidSurfaceY: number,
  terrainHeights: number[],
) {
  if (!Number.isFinite(liquidSurfaceY) || terrainHeights.length === 0) return 0;

  let visibleSamples = 0;
  for (const terrainY of terrainHeights) {
    if (Number.isFinite(terrainY) && liquidSurfaceY >= terrainY) {
      visibleSamples++;
    }
  }

  if (visibleSamples === 0) return 0;
  return 0.9 * (visibleSamples / terrainHeights.length);
}

export function getLiquidSurfaceY(
  globals: GlobalsInterface,
  headerData: HeaderData,
  terrainData: TerrainData,
  liquidBody: Liquid,
) {
  return (
    sampleTerrainHeightAtPoint(
      liquidBody.hotSpotX,
      liquidBody.hotSpotZ,
      headerData,
      terrainData,
      globals,
    ) + DEFAULT_LIQUID_HEIGHT_OFFSET
  );
}

export interface LiquidBodyCanvas {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}

export function buildLiquidBodyCanvas(
  globals: GlobalsInterface,
  headerData: HeaderData,
  terrainData: TerrainData,
  liquidBody: Liquid,
): LiquidBodyCanvas | null {
  const visibleNubs = liquidBody.nubs
    .slice(0, liquidBody.numNubs)
    .filter((nub) => Array.isArray(nub) && nub.length >= 2);
  if (visibleNubs.length < 3) return null;

  const texture = getLiquidTextureCanvas(globals, liquidBody.type);
  const liquidSurfaceY = getLiquidSurfaceY(globals, headerData, terrainData, liquidBody);

  const points = visibleNubs.map((nub) => [nub[0], nub[1]] as [number, number]);
  const minX = Math.floor(Math.min(...points.map((p) => p[0])));
  const maxX = Math.ceil(Math.max(...points.map((p) => p[0])));
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const cellSize = Math.max(1, Math.round(globals.TILE_SIZE / 4));
  const pattern = ctx.createPattern(texture, "repeat");
  if (!pattern) return null;

  const firstPoint = points[0];
  if (!firstPoint) return null;

  ctx.save();
  ctx.translate(-minX, -minY);
  ctx.beginPath();
  ctx.moveTo(firstPoint[0], firstPoint[1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (!point) continue;
    ctx.lineTo(point[0], point[1]);
  }
  ctx.closePath();
  ctx.clip();

  for (let y = Math.floor(minY / cellSize) * cellSize; y < maxY; y += cellSize) {
    for (let x = Math.floor(minX / cellSize) * cellSize; x < maxX; x += cellSize) {
      const terrainHeights = [
        sampleTerrainHeightAtPoint(x + 1, y + 1, headerData, terrainData, globals),
        sampleTerrainHeightAtPoint(x + cellSize - 1, y + 1, headerData, terrainData, globals),
        sampleTerrainHeightAtPoint(x + 1, y + cellSize - 1, headerData, terrainData, globals),
        sampleTerrainHeightAtPoint(
          x + cellSize - 1,
          y + cellSize - 1,
          headerData,
          terrainData,
          globals,
        ),
        sampleTerrainHeightAtPoint(
          x + cellSize / 2,
          y + cellSize / 2,
          headerData,
          terrainData,
          globals,
        ),
      ];
      const opacity = getLiquidCoverageOpacity(liquidSurfaceY, terrainHeights);
      if (opacity <= 0) continue;

      ctx.globalAlpha = opacity;
      ctx.fillStyle = pattern;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  return { canvas, x: minX, y: minY };
}
