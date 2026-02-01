/**
 * Tests for tile atoms and constants
 */

import { describe, it, expect } from "vitest";
import {
  TileViews,
  TopologyBrushMode,
  TopologyValueMode,
  TILE_ATTRIB_BLANK,
  TILE_ATTRIB_ELECTROCUTE_AREA0,
  TILE_ATTRIB_ELECTROCUTE_AREA1,
} from "@/data/tiles/tileAtoms";

describe("Tile Atoms", () => {
  describe("Tile Views Enum", () => {
    it("has Topology view", () => {
      expect(TileViews.Topology).toBeDefined();
    });

    it("has Flags view", () => {
      expect(TileViews.Flags).toBeDefined();
    });

    it("has ElectricFloor0 view", () => {
      expect(TileViews.ElectricFloor0).toBeDefined();
    });

    it("has ElectricFloor1 view", () => {
      expect(TileViews.ElectricFloor1).toBeDefined();
    });

    it("views have unique values", () => {
      const values = new Set([
        TileViews.Topology,
        TileViews.Flags,
        TileViews.ElectricFloor0,
        TileViews.ElectricFloor1,
      ]);
      expect(values.size).toBe(4);
    });
  });

  describe("Topology Brush Mode Enum", () => {
    it("has CIRCLE_BRUSH mode", () => {
      expect(TopologyBrushMode.CIRCLE_BRUSH).toBeDefined();
    });

    it("has SQUARE_BRUSH mode", () => {
      expect(TopologyBrushMode.SQUARE_BRUSH).toBeDefined();
    });

    it("modes have unique values", () => {
      expect(TopologyBrushMode.CIRCLE_BRUSH).not.toBe(TopologyBrushMode.SQUARE_BRUSH);
    });
  });

  describe("Topology Value Mode Enum", () => {
    it("has SET_VALUE mode", () => {
      expect(TopologyValueMode.SET_VALUE).toBeDefined();
    });

    it("has DELTA_VALUE mode", () => {
      expect(TopologyValueMode.DELTA_VALUE).toBeDefined();
    });

    it("has DELTA_WITH_DROPOFF mode", () => {
      expect(TopologyValueMode.DELTA_WITH_DROPOFF).toBeDefined();
    });

    it("modes have unique values", () => {
      const values = new Set([
        TopologyValueMode.SET_VALUE,
        TopologyValueMode.DELTA_VALUE,
        TopologyValueMode.DELTA_WITH_DROPOFF,
      ]);
      expect(values.size).toBe(3);
    });
  });

  describe("Tile Attribute Constants", () => {
    it("TILE_ATTRIB_BLANK is bit 0", () => {
      expect(TILE_ATTRIB_BLANK).toBe(1);
    });

    it("TILE_ATTRIB_ELECTROCUTE_AREA0 is bit 1", () => {
      expect(TILE_ATTRIB_ELECTROCUTE_AREA0).toBe(2);
    });

    it("TILE_ATTRIB_ELECTROCUTE_AREA1 is bit 2", () => {
      expect(TILE_ATTRIB_ELECTROCUTE_AREA1).toBe(4);
    });

    it("constants are distinct powers of 2", () => {
      // All should be powers of 2
      expect(TILE_ATTRIB_BLANK & (TILE_ATTRIB_BLANK - 1)).toBe(0);
      expect(TILE_ATTRIB_ELECTROCUTE_AREA0 & (TILE_ATTRIB_ELECTROCUTE_AREA0 - 1)).toBe(0);
      expect(TILE_ATTRIB_ELECTROCUTE_AREA1 & (TILE_ATTRIB_ELECTROCUTE_AREA1 - 1)).toBe(0);
    });

    it("constants can be combined with bitwise OR", () => {
      const combined = TILE_ATTRIB_BLANK | TILE_ATTRIB_ELECTROCUTE_AREA0;
      expect(combined).toBe(3);
      
      // Can check individual flags
      expect(combined & TILE_ATTRIB_BLANK).toBe(TILE_ATTRIB_BLANK);
      expect(combined & TILE_ATTRIB_ELECTROCUTE_AREA0).toBe(TILE_ATTRIB_ELECTROCUTE_AREA0);
      expect(combined & TILE_ATTRIB_ELECTROCUTE_AREA1).toBe(0);
    });

    it("constants do not overlap", () => {
      // No two constants should share bits
      expect(TILE_ATTRIB_BLANK & TILE_ATTRIB_ELECTROCUTE_AREA0).toBe(0);
      expect(TILE_ATTRIB_BLANK & TILE_ATTRIB_ELECTROCUTE_AREA1).toBe(0);
      expect(TILE_ATTRIB_ELECTROCUTE_AREA0 & TILE_ATTRIB_ELECTROCUTE_AREA1).toBe(0);
    });
  });

  describe("Bit Flag Usage Patterns", () => {
    it("can set individual flag", () => {
      let attrib = 0;
      attrib |= TILE_ATTRIB_BLANK;
      expect(attrib).toBe(1);
    });

    it("can clear individual flag", () => {
      let attrib = 7; // All 3 flags set
      attrib &= ~TILE_ATTRIB_BLANK;
      expect(attrib).toBe(6); // Only electric areas remain
    });

    it("can toggle flag", () => {
      let attrib = TILE_ATTRIB_BLANK;
      attrib ^= TILE_ATTRIB_ELECTROCUTE_AREA0; // Toggle on
      expect(attrib).toBe(3);
      attrib ^= TILE_ATTRIB_ELECTROCUTE_AREA0; // Toggle off
      expect(attrib).toBe(1);
    });

    it("can check if flag is set", () => {
      const attrib = TILE_ATTRIB_BLANK | TILE_ATTRIB_ELECTROCUTE_AREA1;
      
      expect((attrib & TILE_ATTRIB_BLANK) !== 0).toBe(true);
      expect((attrib & TILE_ATTRIB_ELECTROCUTE_AREA0) !== 0).toBe(false);
      expect((attrib & TILE_ATTRIB_ELECTROCUTE_AREA1) !== 0).toBe(true);
    });
  });
});
