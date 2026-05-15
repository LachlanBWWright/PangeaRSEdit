import { err, ok, type Result } from "neverthrow";
import type { Draft } from "immer";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { setMightyMikeTileLogicalIndex } from "@/data/game/mightyMikeTileValueUtils";
import type {
  TileBrush,
  TileBrushAnchor,
  TileBrushGame,
} from "./tileBrushTypes";

export interface CreateTileBrushFromRegionArgs {
  readonly id: string;
  readonly name: string;
  readonly game: TileBrushGame;
  readonly terrainData: TerrainData;
  readonly layer: 1000 | 1001;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly startX: number;
  readonly startY: number;
  readonly width: number;
  readonly height: number;
}

export interface ApplyTileBrushArgs {
  readonly draft: Draft<TerrainData>;
  readonly layer: 1000 | 1001;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly brush: TileBrush;
  readonly anchor: TileBrushAnchor;
}

export interface TileBrushApplyResult {
  readonly modifiedIndices: number[];
  readonly skippedCells: number;
}

export function createTileBrushFromRegion(
  args: CreateTileBrushFromRegionArgs,
): Result<TileBrush, string> {
  if (
    args.startX < 0 ||
    args.startY < 0 ||
    args.width <= 0 ||
    args.height <= 0
  ) {
    return err("Invalid region dimensions.");
  }
  if (args.startX >= args.mapWidth || args.startY >= args.mapHeight) {
    return err("Region starts outside map bounds.");
  }

  const layerData = args.terrainData.Layr?.[args.layer]?.obj;
  if (!layerData) {
    return err("Terrain layer is not available.");
  }

  const cells = [];
  for (let y = 0; y < args.height; y += 1) {
    for (let x = 0; x < args.width; x += 1) {
      const mapX = args.startX + x;
      const mapY = args.startY + y;
      if (
        mapX < 0 ||
        mapY < 0 ||
        mapX >= args.mapWidth ||
        mapY >= args.mapHeight
      ) {
        cells.push({ tileValue: 0, enabled: false });
        continue;
      }
      const index = mapY * args.mapWidth + mapX;
      const tileValue = layerData[index] ?? 0;
      cells.push({ tileValue, enabled: true });
    }
  }

  return ok({
    id: args.id,
    name: args.name,
    game: args.game,
    width: args.width,
    height: args.height,
    cells,
  });
}

export function getBrushTargetCells(args: {
  readonly targetX: number;
  readonly targetY: number;
  readonly brush: TileBrush;
  readonly anchor: TileBrushAnchor;
}): { x: number; y: number; brushIndex: number; enabled: boolean }[] {
  const startX =
    args.anchor === "center"
      ? args.targetX - Math.floor(args.brush.width / 2)
      : args.targetX;
  const startY =
    args.anchor === "center"
      ? args.targetY - Math.floor(args.brush.height / 2)
      : args.targetY;

  const targets: {
    x: number;
    y: number;
    brushIndex: number;
    enabled: boolean;
  }[] = [];
  for (let y = 0; y < args.brush.height; y += 1) {
    for (let x = 0; x < args.brush.width; x += 1) {
      const brushIndex = y * args.brush.width + x;
      const cell = args.brush.cells[brushIndex];
      targets.push({
        x: startX + x,
        y: startY + y,
        brushIndex,
        enabled: cell?.enabled ?? false,
      });
    }
  }
  return targets;
}

export function applyTileBrush(args: ApplyTileBrushArgs): TileBrushApplyResult {
  const layerData = args.draft.Layr?.[args.layer]?.obj;
  if (!layerData) {
    return { modifiedIndices: [], skippedCells: args.brush.cells.length };
  }

  const targets = getBrushTargetCells({
    targetX: args.targetX,
    targetY: args.targetY,
    brush: args.brush,
    anchor: args.anchor,
  });

  const modifiedIndices: number[] = [];
  let skippedCells = 0;

  for (const target of targets) {
    const cell = args.brush.cells[target.brushIndex];
    if (!cell?.enabled || !target.enabled) {
      skippedCells += 1;
      continue;
    }

    if (
      target.x < 0 ||
      target.y < 0 ||
      target.x >= args.mapWidth ||
      target.y >= args.mapHeight
    ) {
      skippedCells += 1;
      continue;
    }

    const mapIndex = target.y * args.mapWidth + target.x;
    if (args.brush.game === "mightymike" && args.layer === 1000) {
      setMightyMikeTileLogicalIndex(args.draft, mapIndex, cell.tileValue);
    } else {
      layerData[mapIndex] = cell.tileValue;
    }
    modifiedIndices.push(mapIndex);
  }

  return {
    modifiedIndices,
    skippedCells,
  };
}
