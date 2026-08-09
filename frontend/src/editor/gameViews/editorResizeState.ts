import type {
  FenceData,
  HeaderData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { Updater } from "use-immer";
import { combineLevelData, splitLevelData } from "@/data/utils/levelDataUtils";
import { runLevelResizeWorker } from "@/workers/runLevelResizeWorker";

interface BaseResizeArgs {
  readonly headerData: HeaderData;
  readonly itemData: ItemData | null;
  readonly liquidData: LiquidData | null;
  readonly fenceData: FenceData | null;
  readonly splineData: SplineData | null;
  readonly terrainData: TerrainData;
  readonly globals: GlobalsInterface;
  readonly direction: "top" | "bottom" | "left" | "right";
  readonly defaultHeight: number;
  readonly setHeaderData: Updater<HeaderData>;
  readonly setItemData: (next: ItemData | null) => void;
  readonly setLiquidData: (next: LiquidData | null) => void;
  readonly setFenceData: (next: FenceData | null) => void;
  readonly setSplineData: (next: SplineData | null) => void;
  readonly setTerrainData: Updater<TerrainData>;
}

interface TileResizeArgs extends BaseResizeArgs {
  readonly tileCount: number;
}

interface SupertileResizeArgs extends BaseResizeArgs {
  readonly supertileCount: number;
}

function applyResizeResults(
  args: BaseResizeArgs,
  resized: {
    readonly headerData: HeaderData | null;
    readonly itemData: ItemData | null | undefined;
    readonly liquidData: LiquidData | null | undefined;
    readonly fenceData: FenceData | null | undefined;
    readonly splineData: SplineData | null | undefined;
    readonly terrainData: TerrainData | null;
  },
): void {
  if (resized.headerData) {
    args.setHeaderData(resized.headerData);
  }
  if (resized.itemData !== undefined) {
    args.setItemData(resized.itemData);
  }
  if (resized.liquidData !== undefined) {
    args.setLiquidData(resized.liquidData);
  }
  if (resized.fenceData !== undefined) {
    args.setFenceData(resized.fenceData);
  }
  if (resized.splineData !== undefined) {
    args.setSplineData(resized.splineData);
  }
  if (resized.terrainData) {
    args.setTerrainData(
      args.terrainData.tileset
        ? { ...resized.terrainData, tileset: args.terrainData.tileset }
        : resized.terrainData,
    );
  }
}

async function resizeEditorAtomicData(
  args: BaseResizeArgs,
  mode: "tiles" | "supertiles",
  tileCount: number,
): Promise<void> {
  const workerTerrainData = args.terrainData.tileset
    ? {
        ...args.terrainData,
        tileset: {
          ...args.terrainData.tileset,
          tileImages: undefined,
          collisionImages: undefined,
        },
      }
    : args.terrainData;
  const combined = combineLevelData({
    headerData: args.headerData,
    itemData: args.itemData,
    liquidData: args.liquidData,
    fenceData: args.fenceData,
    splineData: args.splineData,
    terrainData: workerTerrainData,
  });
  if (combined.isErr()) {
    console.error("Failed to prepare level resize:", combined.error);
    return;
  }

  const result = await runLevelResizeWorker({
    mode,
    levelData: combined.value,
    globals: {
      TILES_PER_SUPERTILE: args.globals.TILES_PER_SUPERTILE,
      TILE_INGAME_SIZE: args.globals.TILE_INGAME_SIZE,
      EMPTY_TILE_IDX: args.globals.EMPTY_TILE_IDX,
    },
    options: {
      direction: args.direction,
      tileCount,
      defaultHeight: args.defaultHeight,
    },
  });

  if (result.isErr()) {
    console.error("Failed to resize level:", result.error);
    return;
  }

  applyResizeResults(args, splitLevelData(result.value));
}

export function resizeEditorAtomicTiles(args: TileResizeArgs): Promise<void> {
  return resizeEditorAtomicData(args, "tiles", args.tileCount);
}

export function resizeEditorAtomicSupertiles(
  args: SupertileResizeArgs,
): Promise<void> {
  return resizeEditorAtomicData(
    args,
    "supertiles",
    args.supertileCount * args.globals.TILES_PER_SUPERTILE,
  );
}
