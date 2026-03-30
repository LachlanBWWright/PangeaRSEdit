import { Game, GlobalsInterface } from "@/data/globals/globals";
import { HeaderData, Liquid, TerrainData } from "@/python/structSpecs/LevelTypes";

export type LiquidTextureKind =
  | "water"
  | "soap"
  | "green"
  | "oil"
  | "jungle"
  | "mud"
  | "radioactive"
  | "lava"
  | "garbage"
  | "tar"
  | "pool";

export interface LiquidVisualStyle {
  textureKind: LiquidTextureKind;
  baseColor: string;
  strokeColor: string;
}

interface TerrainHeader {
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  minY: number;
}

const LIQUID_TEXTURE_CACHE = new Map<string, HTMLCanvasElement>();
const LIQUID_TEXTURE_SIZE = 64;
const DEFAULT_LIQUID_HEIGHT_OFFSET = 100;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized;
  const intValue = Number.parseInt(value, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawWaveBands(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
  highlightColor: string,
) {
  const gradient = ctx.createLinearGradient(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  gradient.addColorStop(0, rgba(baseColor, 0.95));
  gradient.addColorStop(0.5, rgba(accentColor, 0.92));
  gradient.addColorStop(1, rgba(baseColor, 0.95));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);

  ctx.strokeStyle = rgba(highlightColor, 0.26);
  ctx.lineWidth = 4;
  for (let y = 8; y < LIQUID_TEXTURE_SIZE; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(12, y - 4, 22, y + 4, 32, y);
    ctx.bezierCurveTo(42, y - 4, 52, y + 4, 64, y);
    ctx.stroke();
  }

  ctx.strokeStyle = rgba(baseColor, 0.16);
  ctx.lineWidth = 2;
  for (let x = 6; x < LIQUID_TEXTURE_SIZE; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 4, LIQUID_TEXTURE_SIZE);
    ctx.stroke();
  }
}

function drawBubbles(ctx: CanvasRenderingContext2D, bubbleColor: string) {
  ctx.fillStyle = rgba(bubbleColor, 0.24);
  const points = [
    [10, 12, 3],
    [24, 18, 2],
    [45, 14, 4],
    [52, 30, 2],
    [14, 42, 3],
    [34, 48, 2],
    [50, 52, 3],
  ];
  for (const point of points) {
    const [x, y, radius] = point;
    if (x === undefined || y === undefined || radius === undefined) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTar(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1c120f";
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);

  const gradient = ctx.createLinearGradient(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  gradient.addColorStop(0, "rgba(70, 42, 32, 0.9)");
  gradient.addColorStop(1, "rgba(20, 12, 10, 0.96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);

  ctx.strokeStyle = "rgba(255, 180, 120, 0.11)";
  ctx.lineWidth = 3;
  for (let y = 4; y < LIQUID_TEXTURE_SIZE; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LIQUID_TEXTURE_SIZE, y + 6);
    ctx.stroke();
  }
}

function drawGarbage(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#4d5533";
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const x = 8 + i * 7;
    ctx.beginPath();
    ctx.arc(x, 10 + ((i * 11) % 40), 2 + (i % 3), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawLava(ctx: CanvasRenderingContext2D, baseColor: string, accentColor: string) {
  const gradient = ctx.createLinearGradient(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  gradient.addColorStop(0, rgba(baseColor, 0.94));
  gradient.addColorStop(0.5, rgba(accentColor, 0.98));
  gradient.addColorStop(1, rgba(baseColor, 0.92));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 4;
  for (let y = 8; y < LIQUID_TEXTURE_SIZE; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(16, y + 8, 32, y - 8, 48, y + 6);
    ctx.bezierCurveTo(54, y + 10, 58, y + 6, 64, y + 2);
    ctx.stroke();
  }
}

function drawMud(ctx: CanvasRenderingContext2D, baseColor: string, accentColor: string) {
  const gradient = ctx.createLinearGradient(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  gradient.addColorStop(0, rgba(baseColor, 0.96));
  gradient.addColorStop(1, rgba(accentColor, 0.96));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);

  ctx.fillStyle = "rgba(255, 240, 210, 0.10)";
  for (let i = 0; i < 9; i++) {
    const x = (i * 13) % LIQUID_TEXTURE_SIZE;
    const y = (i * 19) % LIQUID_TEXTURE_SIZE;
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + (i % 3), 2 + ((i + 1) % 2), i * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGreen(ctx: CanvasRenderingContext2D, baseColor: string, accentColor: string) {
  drawWaveBands(ctx, baseColor, accentColor, "#dfffd8");
  drawBubbles(ctx, "#edffec");
}

function drawSoap(ctx: CanvasRenderingContext2D, baseColor: string, accentColor: string) {
  drawWaveBands(ctx, baseColor, accentColor, "#ffffff");
  drawBubbles(ctx, "#ffffff");
}

function drawPool(ctx: CanvasRenderingContext2D, baseColor: string) {
  const gradient = ctx.createLinearGradient(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  gradient.addColorStop(0, rgba(baseColor, 0.95));
  gradient.addColorStop(1, "rgba(170, 220, 255, 0.96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(18, 18, 8, 0, Math.PI * 2);
  ctx.stroke();
}

function drawWater(ctx: CanvasRenderingContext2D, baseColor: string, accentColor: string) {
  drawWaveBands(ctx, baseColor, accentColor, "#f1fbff");
  drawBubbles(ctx, "#f6fcff");
}

function drawJungle(ctx: CanvasRenderingContext2D, baseColor: string, accentColor: string) {
  drawWaveBands(ctx, baseColor, accentColor, "#e9ffd7");
  ctx.fillStyle = "rgba(233, 255, 215, 0.10)";
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
}

function drawRadioactive(ctx: CanvasRenderingContext2D, baseColor: string, accentColor: string) {
  const gradient = ctx.createRadialGradient(22, 22, 4, 32, 32, 36);
  gradient.addColorStop(0, rgba(accentColor, 0.98));
  gradient.addColorStop(1, rgba(baseColor, 0.94));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(0, 30, LIQUID_TEXTURE_SIZE, 6);
}

function drawTexture(kind: LiquidTextureKind, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (kind) {
    case "soap":
      drawSoap(ctx, "#f2c5d4", "#ffdce6");
      break;
    case "green":
      drawGreen(ctx, "#2b7b4a", "#4ea56a");
      break;
    case "oil":
      drawWater(ctx, "#101010", "#333333");
      break;
    case "jungle":
      drawJungle(ctx, "#2a6d2d", "#3c8c39");
      break;
    case "mud":
      drawMud(ctx, "#6f4d28", "#8b6237");
      break;
    case "radioactive":
      drawRadioactive(ctx, "#5bcf35", "#b7ff4e");
      break;
    case "lava":
      drawLava(ctx, "#8f1800", "#ff5b1a");
      break;
    case "garbage":
      drawGarbage(ctx);
      break;
    case "tar":
      drawTar(ctx);
      break;
    case "pool":
      drawPool(ctx, "#3f97ea");
      break;
    case "water":
    default:
      drawWater(ctx, "#1e72d9", "#4ca1ff");
      break;
  }
}

export function getLiquidVisualStyle(
  globals: GlobalsInterface,
  liquidType: number,
): LiquidVisualStyle {
  switch (globals.GAME_TYPE) {
    case Game.BUGDOM_2:
    case Game.BILLY_FRONTIER:
      switch (liquidType) {
        case 2:
          return {
            textureKind: "garbage",
            baseColor: "#67703f",
            strokeColor: "#aab07a",
          };
        case 1:
          return {
            textureKind: "pool",
            baseColor: "#3f97ea",
            strokeColor: "#cbe9ff",
          };
        case 0:
        default:
          return {
            textureKind: "water",
            baseColor: "#1e72d9",
            strokeColor: "#9fd1ff",
          };
      }
    case Game.CRO_MAG:
      switch (liquidType) {
        case 1:
          return {
            textureKind: "tar",
            baseColor: "#241815",
            strokeColor: "#5a433a",
          };
        case 0:
        default:
          return {
            textureKind: "water",
            baseColor: "#1e72d9",
            strokeColor: "#9fd1ff",
          };
      }
    case Game.NANOSAUR_2:
      switch (liquidType) {
        case 0:
          return {
            textureKind: "green",
            baseColor: "#2b7b4a",
            strokeColor: "#c9ffd8",
          };
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
          return {
            textureKind: "lava",
            baseColor: "#8f1800",
            strokeColor: "#ffc1a5",
          };
        case 1:
        default:
          return {
            textureKind: "water",
            baseColor: "#1e72d9",
            strokeColor: "#9fd1ff",
          };
      }
    case Game.OTTO_MATIC:
    default:
      switch (liquidType) {
        case 1:
          return {
            textureKind: "soap",
            baseColor: "#f2c5d4",
            strokeColor: "#fff0f4",
          };
        case 2:
          return {
            textureKind: "green",
            baseColor: "#2b7b4a",
            strokeColor: "#c9ffd8",
          };
        case 3:
          return {
            textureKind: "oil",
            baseColor: "#101010",
            strokeColor: "#747474",
          };
        case 4:
          return {
            textureKind: "jungle",
            baseColor: "#2a6d2d",
            strokeColor: "#c9ffbd",
          };
        case 5:
          return {
            textureKind: "mud",
            baseColor: "#6f4d28",
            strokeColor: "#d3b08a",
          };
        case 6:
          return {
            textureKind: "radioactive",
            baseColor: "#5bcf35",
            strokeColor: "#ebffd0",
          };
        case 7:
          return {
            textureKind: "lava",
            baseColor: "#8f1800",
            strokeColor: "#ffc1a5",
          };
        case 0:
        default:
          return {
            textureKind: "water",
            baseColor: "#1e72d9",
            strokeColor: "#9fd1ff",
          };
      }
  }
}

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

export function getLiquidTextureCanvas(
  globals: GlobalsInterface,
  liquidType: number,
) {
  const style = getLiquidVisualStyle(globals, liquidType);
  const cacheKey = `${globals.GAME_TYPE}:${liquidType}:${style.textureKind}`;
  const cached = LIQUID_TEXTURE_CACHE.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = LIQUID_TEXTURE_SIZE;
  canvas.height = LIQUID_TEXTURE_SIZE;
  drawTexture(style.textureKind, canvas);
  LIQUID_TEXTURE_CACHE.set(cacheKey, canvas);
  return canvas;
}

export function getLiquidCoverageOpacity(
  liquidSurfaceY: number,
  terrainHeights: number[],
) {
  if (!Number.isFinite(liquidSurfaceY) || terrainHeights.length === 0) {
    return 0;
  }

  let visibleSamples = 0;
  for (const terrainY of terrainHeights) {
    if (Number.isFinite(terrainY) && liquidSurfaceY >= terrainY) {
      visibleSamples++;
    }
  }

  if (visibleSamples === 0) {
    return 0;
  }

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
  const liquidSurfaceY = getLiquidSurfaceY(
    globals,
    headerData,
    terrainData,
    liquidBody,
  );

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
  if (!firstPoint) {
    return null;
  }
  ctx.save();
  ctx.translate(-minX, -minY);
  ctx.beginPath();
  ctx.moveTo(firstPoint[0], firstPoint[1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    if (!point) {
      continue;
    }
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

  return {
    canvas,
    x: minX,
    y: minY,
  };
}
