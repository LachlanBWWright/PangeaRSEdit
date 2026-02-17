/**
 * Tests for Level Requirements
 * 
 * Tests the level requirements and validation functions.
 */

import { describe, it, expect } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  LEVEL_REQUIREMENTS,
  getLevelRequirements,
  validateDimensions,
  getDefaultDimensions,
} from "@/data/levelTemplates/levelRequirements";
import {
  createBlankLevel,
  canCreateBlankLevel,
  getBlankLevelDescription,
} from "@/data/levelTemplates/blankLevelGenerator";

describe("Level Requirements", () => {
  describe("LEVEL_REQUIREMENTS", () => {
    it("has requirements for Otto Matic", () => {
      const req = LEVEL_REQUIREMENTS[Game.OTTO_MATIC];
      expect(req).toBeDefined();
      expect(req.game).toBe(Game.OTTO_MATIC);
    });

    it("Otto Matic has correct configuration", () => {
      const req = LEVEL_REQUIREMENTS[Game.OTTO_MATIC];
      expect(req.tilesPerSupertile).toBe(8);
      expect(req.supertileTextureSize).toBe(128);
      expect(req.supportsFences).toBe(true);
      expect(req.supportsSplines).toBe(true);
      expect(req.supportsWater).toBe(true);
      expect(req.supportsRoof).toBe(false);
    });

    it("Bugdom 1 has roof support", () => {
      const req = LEVEL_REQUIREMENTS[Game.BUGDOM];
      expect(req.supportsRoof).toBe(true);
      expect(req.supportsWater).toBe(false);
      expect(req.tilesPerSupertile).toBe(5);
    });

    it("Nanosaur 1 has minimal features", () => {
      const req = LEVEL_REQUIREMENTS[Game.NANOSAUR];
      expect(req.supportsFences).toBe(false);
      expect(req.supportsSplines).toBe(false);
      expect(req.supportsWater).toBe(false);
    });

    it("Mighty Mike has 2D configuration", () => {
      const req = LEVEL_REQUIREMENTS[Game.MIGHTY_MIKE];
      expect(req.tilesPerSupertile).toBe(1);
      expect(req.requiresYCrd).toBe(false);
      expect(req.supportsFences).toBe(false);
    });
  });

  describe("getLevelRequirements", () => {
    it("returns requirements for specified game", () => {
      const req = getLevelRequirements(Game.BUGDOM_2);
      expect(req.game).toBe(Game.BUGDOM_2);
    });
  });

  describe("validateDimensions", () => {
    it("accepts valid dimensions for Otto Matic", () => {
      const result = validateDimensions(Game.OTTO_MATIC, 64, 64);
      expect(result.valid).toBe(true);
    });

    it("rejects width below minimum", () => {
      const result = validateDimensions(Game.OTTO_MATIC, 8, 64);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Width");
    });

    it("rejects height above maximum", () => {
      const result = validateDimensions(Game.OTTO_MATIC, 64, 1024);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Height");
    });

    it("rejects dimensions not divisible by supertile size", () => {
      const result = validateDimensions(Game.OTTO_MATIC, 65, 64);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("divisible");
    });

    it("accepts Bugdom 1 dimensions divisible by 5", () => {
      const result = validateDimensions(Game.BUGDOM, 50, 50);
      expect(result.valid).toBe(true);
    });
  });

  describe("getDefaultDimensions", () => {
    it("returns dimensions for Otto Matic", () => {
      const dims = getDefaultDimensions(Game.OTTO_MATIC);
      expect(dims.width).toBeGreaterThanOrEqual(16);
      expect(dims.height).toBeGreaterThanOrEqual(16);
      expect(dims.width % 8).toBe(0);
      expect(dims.height % 8).toBe(0);
    });

    it("returns dimensions for Bugdom divisible by 5", () => {
      const dims = getDefaultDimensions(Game.BUGDOM);
      expect(dims.width % 5).toBe(0);
      expect(dims.height % 5).toBe(0);
    });
  });
});

describe("Blank Level Generator", () => {
  describe("canCreateBlankLevel", () => {
    it("returns true for Otto Matic", () => {
      expect(canCreateBlankLevel()).toBe(true);
    });

    it("returns true for Nanosaur", () => {
      expect(canCreateBlankLevel()).toBe(true);
    });
  });

  describe("createBlankLevel", () => {
    it("creates valid Otto Matic level", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, { width: 64, height: 64 });
      
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const level = result.value;
      expect(level.headerData.Hedr).toBeDefined();
      expect(level.terrainData.YCrd).toBeDefined();
      expect(level.terrainData.Atrb).toBeDefined();
      expect(level.itemData.Itms).toBeDefined();
      expect(level.fenceData).not.toBeNull();
      expect(level.splineData).not.toBeNull();
      expect(level.liquidData).not.toBeNull();
    });

    it("creates valid Bugdom 1 level with roof", () => {
      const result = createBlankLevel(Game.BUGDOM, { width: 50, height: 50 });
      
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const level = result.value;
      // Bugdom has roof layer
      expect(level.terrainData.YCrd[1001]).toBeDefined();
      // Bugdom has no water
      expect(level.liquidData).toBeNull();
    });

    it("creates valid Nanosaur level without optional data", () => {
      const result = createBlankLevel(Game.NANOSAUR, { width: 50, height: 50 });
      
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const level = result.value;
      expect(level.fenceData).toBeNull();
      expect(level.splineData).toBeNull();
      expect(level.liquidData).toBeNull();
    });

    it("returns error for invalid dimensions", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, { width: 5, height: 64 });
      
      expect(result.isErr()).toBe(true);
    });

    it("initializes terrain with correct size", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, { width: 32, height: 48 });
      
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const level = result.value;
      const yCrd = level.terrainData.YCrd[1000].obj;
      expect(yCrd).toBeDefined();
      expect(yCrd.length).toBe((32 + 1) * (48 + 1));
    });

    it("uses custom terrain height", () => {
      const result = createBlankLevel(Game.OTTO_MATIC, {
        width: 32,
        height: 32,
        defaultTerrainHeight: 100,
      });
      
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const level = result.value;
      const yCrd = level.terrainData.YCrd[1000].obj;
      expect(yCrd[0]).toBe(100);
    });

    it("creates header with correct dimensions", () => {
      const result = createBlankLevel(Game.BUGDOM_2, { width: 64, height: 80 });
      
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const level = result.value;
      const header = level.headerData.Hedr[1000].obj;
      expect(header.mapWidth).toBe(64);
      expect(header.mapHeight).toBe(80);
    });

    it("creates Cro-Mag level with numPaths", () => {
      const result = createBlankLevel(Game.CRO_MAG, { width: 64, height: 64 });
      
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;

      const level = result.value;
      const header = level.headerData.Hedr[1000].obj;
      // Cro-Mag header should have numPaths instead of numWaterPatches
      expect("numPaths" in header).toBe(true);
    });
  });

  describe("getBlankLevelDescription", () => {
    it("describes Otto Matic with all features", () => {
      const desc = getBlankLevelDescription(Game.OTTO_MATIC);
      expect(desc).toContain("terrain");
      expect(desc).toContain("fences");
      expect(desc).toContain("splines");
      expect(desc).toContain("water");
    });

    it("describes Bugdom with roof but no water", () => {
      const desc = getBlankLevelDescription(Game.BUGDOM);
      expect(desc).toContain("roof");
      expect(desc).not.toContain("water");
    });

    it("describes Nanosaur with minimal features", () => {
      const desc = getBlankLevelDescription(Game.NANOSAUR);
      expect(desc).toContain("terrain");
      expect(desc).not.toContain("fences");
      expect(desc).not.toContain("splines");
    });
  });
});
