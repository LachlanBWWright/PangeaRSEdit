import type { HeaderData } from "@/python/structSpecs/LevelTypes";
import type { Updater } from "use-immer";
import { TileViews } from "@/data/tiles/tileAtoms";
import { CanvasView } from "@/data/canvasView/canvasViewAtoms";

export function getHeaderHeightBounds(headerData: HeaderData): {
  minY: number;
  maxY: number;
} {
  const header = headerData?.Hedr?.[1000]?.obj;
  return {
    minY: header?.minY || 0,
    maxY: header?.maxY || 0,
  };
}

export function createHeaderHeightChangeHandler(
  setHeaderData: Updater<HeaderData>,
  key: "minY" | "maxY",
): (event: React.ChangeEvent<HTMLInputElement>) => void {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number.parseFloat(event.target.value);
    if (Number.isNaN(newValue)) {
      return;
    }

    setHeaderData((draft) => {
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj[key] = newValue;
      }
    });
  };
}

export function getOttoTileTabValue(tileView: TileViews): string {
  if (tileView === TileViews.Topology) {
    return "topology";
  }
  if (tileView === TileViews.Flags) {
    return "flags";
  }
  if (tileView === TileViews.ElectricFloor0) {
    return "electric0";
  }
  return "electric1";
}

export function getTileViewForTab(value: string): TileViews {
  if (value === "topology") {
    return TileViews.Topology;
  }
  if (value === "flags") {
    return TileViews.Flags;
  }
  if (value === "electric0") {
    return TileViews.ElectricFloor0;
  }
  if (value === "electric1") {
    return TileViews.ElectricFloor1;
  }
  return TileViews.Topology;
}

export function shouldForceTwoDForTileView(tileView: TileViews): boolean {
  return tileView !== TileViews.Topology;
}

export function toCanvasViewFromTileView(tileView: TileViews): CanvasView {
  return shouldForceTwoDForTileView(tileView)
    ? CanvasView.TWO_D
    : CanvasView.THREE_D;
}
