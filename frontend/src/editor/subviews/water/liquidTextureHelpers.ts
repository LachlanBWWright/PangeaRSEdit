import { Game, type GlobalsInterface } from "@/data/globals/globals";

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

const LIQUID_TEXTURE_CACHE = new Map<string, HTMLCanvasElement>();
const LIQUID_TEXTURE_SIZE = 64;

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
  const gradient = ctx.createLinearGradient(
    0,
    0,
    LIQUID_TEXTURE_SIZE,
    LIQUID_TEXTURE_SIZE,
  );
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
    if (x === undefined || y === undefined || radius === undefined) continue;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTar(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1c120f";
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
  const gradient = ctx.createLinearGradient(
    0,
    0,
    LIQUID_TEXTURE_SIZE,
    LIQUID_TEXTURE_SIZE,
  );
  gradient.addColorStop(0, "rgba(70, 42, 32, 0.9)");
  gradient.addColorStop(1, "rgba(20, 12, 10, 0.96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
}

function drawGarbage(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#4d5533";
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
}

function drawLava(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
) {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    LIQUID_TEXTURE_SIZE,
    LIQUID_TEXTURE_SIZE,
  );
  gradient.addColorStop(0, rgba(baseColor, 0.94));
  gradient.addColorStop(0.5, rgba(accentColor, 0.98));
  gradient.addColorStop(1, rgba(baseColor, 0.92));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
}

function drawMud(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
) {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    LIQUID_TEXTURE_SIZE,
    LIQUID_TEXTURE_SIZE,
  );
  gradient.addColorStop(0, rgba(baseColor, 0.96));
  gradient.addColorStop(1, rgba(accentColor, 0.96));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
}

function drawGreen(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
) {
  drawWaveBands(ctx, baseColor, accentColor, "#dfffd8");
  drawBubbles(ctx, "#edffec");
}

function drawSoap(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
) {
  drawWaveBands(ctx, baseColor, accentColor, "#ffffff");
  drawBubbles(ctx, "#ffffff");
}

function drawPool(ctx: CanvasRenderingContext2D, baseColor: string) {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    LIQUID_TEXTURE_SIZE,
    LIQUID_TEXTURE_SIZE,
  );
  gradient.addColorStop(0, rgba(baseColor, 0.95));
  gradient.addColorStop(1, "rgba(170, 220, 255, 0.96)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
) {
  drawWaveBands(ctx, baseColor, accentColor, "#f1fbff");
  drawBubbles(ctx, "#f6fcff");
}

function drawJungle(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
) {
  drawWaveBands(ctx, baseColor, accentColor, "#e9ffd7");
}

function drawRadioactive(
  ctx: CanvasRenderingContext2D,
  baseColor: string,
  accentColor: string,
) {
  const gradient = ctx.createRadialGradient(22, 22, 4, 32, 32, 36);
  gradient.addColorStop(0, rgba(accentColor, 0.98));
  gradient.addColorStop(1, rgba(baseColor, 0.94));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LIQUID_TEXTURE_SIZE, LIQUID_TEXTURE_SIZE);
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
      if (liquidType === 2) {
        return {
          textureKind: "garbage",
          baseColor: "#67703f",
          strokeColor: "#aab07a",
        };
      }
      if (liquidType === 1) {
        return {
          textureKind: "pool",
          baseColor: "#3f97ea",
          strokeColor: "#cbe9ff",
        };
      }
      return {
        textureKind: "water",
        baseColor: "#1e72d9",
        strokeColor: "#9fd1ff",
      };
    case Game.CRO_MAG:
      if (liquidType === 1) {
        return {
          textureKind: "tar",
          baseColor: "#241815",
          strokeColor: "#5a433a",
        };
      }
      return {
        textureKind: "water",
        baseColor: "#1e72d9",
        strokeColor: "#9fd1ff",
      };
    case Game.NANOSAUR_2:
      if (liquidType === 0) {
        return {
          textureKind: "green",
          baseColor: "#2b7b4a",
          strokeColor: "#c9ffd8",
        };
      }
      if ([2, 3, 4, 5, 6, 7, 8, 9, 10].includes(liquidType)) {
        return {
          textureKind: "lava",
          baseColor: "#8f1800",
          strokeColor: "#ffc1a5",
        };
      }
      return {
        textureKind: "water",
        baseColor: "#1e72d9",
        strokeColor: "#9fd1ff",
      };
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

export function getLiquidTextureCanvas(
  globals: GlobalsInterface,
  liquidType: number,
): HTMLCanvasElement {
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
