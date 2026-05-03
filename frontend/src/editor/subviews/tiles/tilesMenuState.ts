import { Game } from "@/data/globals/globals";
import { CanvasView } from "@/data/canvasView/canvasViewAtoms";
import { TileViews } from "@/data/tiles/tileAtoms";

export function getTileMenuFlags(gameType: Game): {
  hasElectricFloorOptions: boolean;
  usesIndividualTiles: boolean;
  hasTileFlags: boolean;
} {
  const hasElectricFloorOptions = gameType === Game.OTTO_MATIC;
  const usesIndividualTiles =
    gameType === Game.BUGDOM || gameType === Game.NANOSAUR;
  return {
    hasElectricFloorOptions,
    usesIndividualTiles,
    hasTileFlags: !usesIndividualTiles,
  };
}

export function getTabForTileView(tileView: TileViews): string {
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

export function getTileViewForTab(value: string): {
  tileView: TileViews;
  forceTwoD: boolean;
} {
  if (value === "topology") {
    return { tileView: TileViews.Topology, forceTwoD: false };
  }
  if (value === "flags") {
    return { tileView: TileViews.Flags, forceTwoD: true };
  }
  if (value === "electric0") {
    return { tileView: TileViews.ElectricFloor0, forceTwoD: true };
  }
  return { tileView: TileViews.ElectricFloor1, forceTwoD: true };
}

export function getNextCanvasViewMode(enabled: boolean): CanvasView {
  return enabled ? CanvasView.THREE_D : CanvasView.TWO_D;
}

export function parseFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export function parseIntOrZero(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed;
}
