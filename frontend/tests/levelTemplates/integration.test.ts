/**
 * Integration tests for level templates and blank level generation
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

describe("Level Templates Integration", () => {
  describe("Level Requirements Coverage", () => {
    it("has requirements for all major games", () => {
      // All major Pangea games should have requirements
      expect(LEVEL_REQUIREMENTS[Game.OTTO_MATIC]).toBeDefined();
      expect(LEVEL_REQUIREMENTS[Game.BUGDOM]).toBeDefined();
      expect(LEVEL_REQUIREMENTS[Game.BUGDOM_2]).toBeDefined();
      expect(LEVEL_REQUIREMENTS[Game.NANOSAUR]).toBeDefined();
      expect(LEVEL_REQUIREMENTS[Game.NANOSAUR_2]).toBeDefined();
      expect(LEVEL_REQUIREMENTS[Game.CRO_MAG]).toBeDefined();
      expect(LEVEL_REQUIREMENTS[Game.BILLY_FRONTIER]).toBeDefined();
    });

    it("requirements have valid dimension constraints", () => {
      for (const req of Object.values(LEVEL_REQUIREMENTS)) {
        // Min must be positive
        expect(req.minMapWidth).toBeGreaterThan(0);
        expect(req.minMapHeight).toBeGreaterThan(0);

        // Max must be >= min
        expect(req.maxMapWidth).toBeGreaterThanOrEqual(req.minMapWidth);
        expect(req.maxMapHeight).toBeGreaterThanOrEqual(req.minMapHeight);
      }
    });

    it("getLevelRequirements returns correct requirements", () => {
      const ottoReqs = getLevelRequirements(Game.OTTO_MATIC);

      expect(ottoReqs).toBeDefined();
      expect(ottoReqs.game).toBe(Game.OTTO_MATIC);
      expect(ottoReqs.requiresHeader).toBe(true);
    });
  });

  describe("Dimension Validation", () => {
    it("validates dimensions within range", () => {
      const reqs = getLevelRequirements(Game.OTTO_MATIC);

      // Valid dimensions
      const validResult = validateDimensions(
        Game.OTTO_MATIC,
        reqs.minMapWidth,
        reqs.minMapHeight,
      );
      expect(validResult.valid).toBe(true);
    });

    it("rejects dimensions below minimum", () => {
      const result = validateDimensions(Game.OTTO_MATIC, 1, 1);
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });

    it("rejects dimensions above maximum", () => {
      const result = validateDimensions(Game.OTTO_MATIC, 10000, 10000);
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });

    it("getDefaultDimensions returns valid dimensions", () => {
      for (const req of Object.values(LEVEL_REQUIREMENTS)) {
        const dims = getDefaultDimensions(req.game);

        const validation = validateDimensions(
          req.game,
          dims.width,
          dims.height,
        );
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe("Blank Level Creation", () => {
    it("can create blank level for supported games", () => {
      expect(canCreateBlankLevel()).toBe(true);
    });

    it("creates valid blank level for Otto Matic", () => {
      const dims = getDefaultDimensions(Game.OTTO_MATIC);
      const result = createBlankLevel(Game.OTTO_MATIC, dims);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeDefined();
        expect(result.value.headerData).toBeDefined();
        expect(result.value.terrainData).toBeDefined();
        expect(result.value.itemData).toBeDefined();
      }
    });

    it("creates valid blank level for Nanosaur 2", () => {
      const dims = getDefaultDimensions(Game.NANOSAUR_2);
      const result = createBlankLevel(Game.NANOSAUR_2, dims);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeDefined();
        expect(result.value.headerData).toBeDefined();
        expect(result.value.terrainData).toBeDefined();
      }
    });

    it("creates valid blank level with custom dimensions", () => {
      const reqs = getLevelRequirements(Game.OTTO_MATIC);
      const result = createBlankLevel(Game.OTTO_MATIC, {
        width: reqs.minMapWidth * 2,
        height: reqs.minMapHeight * 2,
      });

      expect(result.isOk()).toBe(true);
    });

    it("getBlankLevelDescription returns non-empty string", () => {
      const desc = getBlankLevelDescription(Game.OTTO_MATIC);
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(0);
    });
  });

  describe("Game-Specific Requirements", () => {
    it("Otto Matic requires Atrb for tile attributes", () => {
      const reqs = getLevelRequirements(Game.OTTO_MATIC);
      expect(reqs.requiresAtrb).toBe(true);
    });

    it("Bugdom 1 requires tile-based data", () => {
      const reqs = getLevelRequirements(Game.BUGDOM);
      expect(reqs.requiresLayr).toBe(true);
    });

    it("Nanosaur 1 requires tile-based data", () => {
      const reqs = getLevelRequirements(Game.NANOSAUR);
      expect(reqs.requiresLayr).toBe(true);
    });

    it("Billy Frontier supports splines", () => {
      const reqs = getLevelRequirements(Game.BILLY_FRONTIER);
      expect(reqs.supportsSplines).toBe(true);
    });

    it("Cro-Mag Rally has checkpoint support", () => {
      const reqs = getLevelRequirements(Game.CRO_MAG);
      expect(reqs.supportsCheckpoints).toBe(true);
    });
  });
});
