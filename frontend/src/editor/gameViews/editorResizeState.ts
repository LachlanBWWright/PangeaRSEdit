import type {
  FenceData,
  HeaderData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import {
  applyResizeToAtomicData,
  applySupertileResizeToAtomicData,
} from "@/editor/utils/levelResizeHandlers";
import type { Updater } from "use-immer";

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
    args.setTerrainData(resized.terrainData);
  }
}

export function resizeEditorAtomicTiles(args: TileResizeArgs): void {
  const result = applyResizeToAtomicData(
    {
      headerData: args.headerData,
      itemData: args.itemData,
      liquidData: args.liquidData,
      fenceData: args.fenceData,
      splineData: args.splineData,
      terrainData: args.terrainData,
    },
    args.globals,
    {
      direction: args.direction,
      tileCount: args.tileCount,
      defaultHeight: args.defaultHeight,
    },
  );

  if (result.isErr()) {
    console.error("Failed to resize level:", result.error);
    return;
  }

  applyResizeResults(args, result.value.data);
}

export function resizeEditorAtomicSupertiles(args: SupertileResizeArgs): void {
  const result = applySupertileResizeToAtomicData(
    {
      headerData: args.headerData,
      itemData: args.itemData,
      liquidData: args.liquidData,
      fenceData: args.fenceData,
      splineData: args.splineData,
      terrainData: args.terrainData,
    },
    args.globals,
    {
      direction: args.direction,
      tileCount: args.supertileCount * args.globals.TILES_PER_SUPERTILE,
      defaultHeight: args.defaultHeight,
    },
  );

  if (result.isErr()) {
    console.error("Failed to resize level:", result.error);
    return;
  }

  applyResizeResults(args, result.value.data);
}
