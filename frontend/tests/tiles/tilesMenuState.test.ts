import { describe, expect, it } from "vitest";
import { CanvasView } from "@/data/canvasView/canvasViewAtoms";
import { Game } from "@/data/globals/globals";
import { TileViews } from "@/data/tiles/tileAtoms";
import {
  getNextCanvasViewMode,
  getTabForTileView,
  getTileMenuFlags,
  getTileViewForTab as getSubviewTileViewForTab,
  parseFiniteNumber,
  parseIntOrZero,
} from "@/editor/subviews/tiles/tilesMenuState";
import {
  getOttoTileTabValue,
  getTileViewForTab,
  shouldForceTwoDForTileView,
  toCanvasViewFromTileView,
} from "@/editor/gameViews/tilesMenuState";

describe("tiles menu state", () => {
  it.each([
    [Game.OTTO_MATIC, { hasElectricFloorOptions: true, usesIndividualTiles: false, hasTileFlags: true }],
    [Game.BUGDOM, { hasElectricFloorOptions: false, usesIndividualTiles: true, hasTileFlags: false }],
    [Game.NANOSAUR, { hasElectricFloorOptions: false, usesIndividualTiles: true, hasTileFlags: false }],
    [Game.CRO_MAG, { hasElectricFloorOptions: false, usesIndividualTiles: false, hasTileFlags: true }],
  ])("derives editor capabilities for game %s", (game, expected) => {
    expect(getTileMenuFlags(game)).toEqual(expected);
  });

  it.each([
    [TileViews.Topology, "topology"],
    [TileViews.Flags, "flags"],
    [TileViews.ElectricFloor0, "electric0"],
    [TileViews.ElectricFloor1, "electric1"],
  ])("maps tile view %s to tab %s", (view, tab) => {
    expect(getTabForTileView(view)).toBe(tab);
  });

  it("maps tabs back to tile views and chooses 2D for attribute-like views", () => {
    expect(getSubviewTileViewForTab("topology")).toEqual({ tileView: TileViews.Topology, forceTwoD: false });
    expect(getSubviewTileViewForTab("flags")).toEqual({ tileView: TileViews.Flags, forceTwoD: true });
    expect(getSubviewTileViewForTab("electric0")).toEqual({ tileView: TileViews.ElectricFloor0, forceTwoD: true });
    expect(getSubviewTileViewForTab("anything-else")).toEqual({ tileView: TileViews.ElectricFloor1, forceTwoD: true });
    expect(getNextCanvasViewMode(true)).toBe(CanvasView.THREE_D);
    expect(getNextCanvasViewMode(false)).toBe(CanvasView.TWO_D);
  });

  it("maps the Otto view state and canvas presentation consistently", () => {
    expect(getOttoTileTabValue(TileViews.Topology)).toBe("topology");
    expect(getOttoTileTabValue(TileViews.Flags)).toBe("flags");
    expect(getOttoTileTabValue(TileViews.ElectricFloor0)).toBe("electric0");
    expect(getOttoTileTabValue(TileViews.ElectricFloor1)).toBe("electric1");
    expect(getTileViewForTab("invalid")).toBe(TileViews.Topology);
    expect(getTileViewForTab("electric1")).toBe(TileViews.ElectricFloor1);
    expect(shouldForceTwoDForTileView(TileViews.Flags)).toBe(true);
    expect(shouldForceTwoDForTileView(TileViews.Topology)).toBe(false);
    expect(toCanvasViewFromTileView(TileViews.Topology)).toBe(CanvasView.THREE_D);
    expect(toCanvasViewFromTileView(TileViews.Flags)).toBe(CanvasView.TWO_D);
  });

  it.each([["1.5", 1.5], ["-2", -2], ["Infinity", null], ["not-a-number", null]])("parses finite number %j", (input, expected) => {
    expect(parseFiniteNumber(input)).toBe(expected);
  });

  it.each([["12", 12], ["-4", -4], ["2.9", 2], ["", 0], ["invalid", 0]])("parses integer %j", (input, expected) => {
    expect(parseIntOrZero(input)).toBe(expected);
  });
});
