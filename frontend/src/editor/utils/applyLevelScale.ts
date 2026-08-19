import type { Updater } from "use-immer";
import type {
  FenceData,
  HeaderData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import {
  getPreservedPositionFactor,
  scaleFenceCoordinates,
  scaleItemCoordinates,
  scaleLiquidCoordinates,
  scaleSplineCoordinates,
  scaleTerrainFeatureCoordinates,
  type LevelScaleMode,
} from "./levelScaleState";

interface ApplyLevelScaleArgs {
  readonly previousTileSize: number;
  readonly nextTileSize: number;
  readonly mode: LevelScaleMode;
  readonly setHeaderData: Updater<HeaderData>;
  readonly setItemData: Updater<ItemData | null>;
  readonly setFenceData: Updater<FenceData | null>;
  readonly setSplineData: Updater<SplineData | null>;
  readonly setLiquidData?: Updater<LiquidData | null>;
  readonly setTerrainData: Updater<TerrainData>;
}

export function applyLevelScale(args: ApplyLevelScaleArgs): void {
  const factor = getPreservedPositionFactor(
    args.previousTileSize,
    args.nextTileSize,
  );

  if (args.mode === "preserve-world-positions" && factor !== null) {
    args.setItemData((draft) => {
      if (draft) scaleItemCoordinates(draft, factor);
    });
    args.setFenceData((draft) => {
      if (draft) scaleFenceCoordinates(draft, factor);
    });
    args.setSplineData((draft) => {
      if (draft) scaleSplineCoordinates(draft, factor);
    });
    args.setLiquidData?.((draft) => {
      if (draft) scaleLiquidCoordinates(draft, factor);
    });
    args.setTerrainData((draft) =>
      scaleTerrainFeatureCoordinates(draft, factor),
    );
  }

  args.setHeaderData((draft) => {
    draft.Hedr[1000].obj.tileSize = args.nextTileSize;
  });
}
