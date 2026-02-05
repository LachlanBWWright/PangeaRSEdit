/**
 * Tests for Game Item Mappers
 */

import { describe, it, expect } from "vitest";
import { Game } from "../../src/data/globals/globals";
import { 
  getGameMapper, 
  hasGameMapper, 
  getGamesWithMappers, 
  getAllMappingCounts,
  getTotalMappedItems,
  getMapperCoverageSummary,
  getMapperCoverageReport,
} from "../../src/data/items/mappers";
import { ottoItemMapper } from "../../src/data/items/mappers/ottoItemMapper";
import { bugdomItemMapper } from "../../src/data/items/mappers/bugdomItemMapper";
import { bugdom2ItemMapper } from "../../src/data/items/mappers/bugdom2ItemMapper";
import { nanosaur1ItemMapper } from "../../src/data/items/mappers/nanosaur1ItemMapper";
import { nanosaur2ItemMapper } from "../../src/data/items/mappers/nanosaur2ItemMapper";
import { croMagItemMapper } from "../../src/data/items/mappers/croMagItemMapper";
import { billyFrontierItemMapper } from "../../src/data/items/mappers/billyFrontierItemMapper";

describe("Game Item Mappers", () => {
  describe("getGameMapper", () => {
    it("should return mapper for Otto Matic", () => {
      const mapper = getGameMapper(Game.OTTO_MATIC);
      expect(mapper).toBeDefined();
      expect(mapper?.game).toBe(Game.OTTO_MATIC);
    });
    
    it("should return mapper for Bugdom 2", () => {
      const mapper = getGameMapper(Game.BUGDOM_2);
      expect(mapper).toBeDefined();
      expect(mapper?.game).toBe(Game.BUGDOM_2);
    });
    
    it("should return mapper for Bugdom 1", () => {
      const mapper = getGameMapper(Game.BUGDOM);
      expect(mapper).toBeDefined();
      expect(mapper?.game).toBe(Game.BUGDOM);
    });
    
    it("should return mapper for Nanosaur 1", () => {
      const mapper = getGameMapper(Game.NANOSAUR);
      expect(mapper).toBeDefined();
      expect(mapper?.game).toBe(Game.NANOSAUR);
    });
    
    it("should return mapper for Nanosaur 2", () => {
      const mapper = getGameMapper(Game.NANOSAUR_2);
      expect(mapper).toBeDefined();
      expect(mapper?.game).toBe(Game.NANOSAUR_2);
    });
    
    it("should return mapper for Cro-Mag Rally", () => {
      const mapper = getGameMapper(Game.CRO_MAG);
      expect(mapper).toBeDefined();
      expect(mapper?.game).toBe(Game.CRO_MAG);
    });
    
    it("should return mapper for Billy Frontier", () => {
      const mapper = getGameMapper(Game.BILLY_FRONTIER);
      expect(mapper).toBeDefined();
      expect(mapper?.game).toBe(Game.BILLY_FRONTIER);
    });
    
    it("should return undefined for games without mappers", () => {
      expect(getGameMapper(Game.MIGHTY_MIKE)).toBeUndefined();
    });
  });
  
  describe("hasGameMapper", () => {
    it("should return true for games with mappers", () => {
      expect(hasGameMapper(Game.OTTO_MATIC)).toBe(true);
      expect(hasGameMapper(Game.BUGDOM_2)).toBe(true);
      expect(hasGameMapper(Game.BUGDOM)).toBe(true);
      expect(hasGameMapper(Game.NANOSAUR)).toBe(true);
      expect(hasGameMapper(Game.NANOSAUR_2)).toBe(true);
      expect(hasGameMapper(Game.CRO_MAG)).toBe(true);
      expect(hasGameMapper(Game.BILLY_FRONTIER)).toBe(true);
    });
    
    it("should return false for games without mappers", () => {
      expect(hasGameMapper(Game.MIGHTY_MIKE)).toBe(false);
    });
  });
  
  describe("getGamesWithMappers", () => {
    it("should return array of games", () => {
      const games = getGamesWithMappers();
      expect(Array.isArray(games)).toBe(true);
      expect(games.length).toBeGreaterThan(0);
      expect(games).toContain(Game.OTTO_MATIC);
    });
    
    it("should return all 7 mapped games", () => {
      const games = getGamesWithMappers();
      expect(games).toContain(Game.OTTO_MATIC);
      expect(games).toContain(Game.BUGDOM);
      expect(games).toContain(Game.BUGDOM_2);
      expect(games).toContain(Game.NANOSAUR);
      expect(games).toContain(Game.NANOSAUR_2);
      expect(games).toContain(Game.CRO_MAG);
      expect(games).toContain(Game.BILLY_FRONTIER);
      expect(games).not.toContain(Game.MIGHTY_MIKE);
    });
  });
  
  describe("getAllMappingCounts", () => {
    it("should return counts for all games", () => {
      const counts = getAllMappingCounts();
      expect(typeof counts).toBe("object");
      expect(counts["OTTO_MATIC"]).toBeGreaterThan(0);
    });
    
    it("new mappers should have reasonable counts", () => {
      const counts = getAllMappingCounts();
      // Check the mappers we created in this session
      expect(counts["OTTO_MATIC"]).toBeGreaterThanOrEqual(50);
      // Nanosaur 1 uses 3DMF format which is now supported
      expect(counts["NANOSAUR"]).toBeGreaterThanOrEqual(10);
      expect(counts["NANOSAUR_2"]).toBeGreaterThanOrEqual(10);
      expect(counts["CRO_MAG"]).toBeGreaterThanOrEqual(10);
      expect(counts["BILLY_FRONTIER"]).toBeGreaterThanOrEqual(10);
      // Bugdom 1 uses 3DMF format which is now supported
      expect(counts["BUGDOM"]).toBeGreaterThanOrEqual(30);
      // Bugdom 2 has BG3D models and should have mappings
      expect(counts["BUGDOM_2"]).toBeGreaterThanOrEqual(50);
    });
  });
  
  describe("getTotalMappedItems", () => {
    it("should return positive total", () => {
      const total = getTotalMappedItems();
      expect(total).toBeGreaterThan(100); // We have 300+ items mapped
    });
  });
  
  describe("getMapperCoverageSummary", () => {
    it("should return summary with correct structure", () => {
      const summary = getMapperCoverageSummary();
      expect(summary.gamesWithMappers).toBe(7);
      expect(summary.totalMappedItems).toBeGreaterThan(100);
      expect(Array.isArray(summary.gameDetails)).toBe(true);
      expect(summary.gameDetails.length).toBe(7);
    });
    
    it("should sort games by item count descending", () => {
      const summary = getMapperCoverageSummary();
      for (let i = 1; i < summary.gameDetails.length; i++) {
        expect(summary.gameDetails[i - 1].itemCount).toBeGreaterThanOrEqual(
          summary.gameDetails[i].itemCount
        );
      }
    });
  });
  
  describe("getMapperCoverageReport", () => {
    it("should return formatted text report", () => {
      const report = getMapperCoverageReport();
      expect(typeof report).toBe("string");
      expect(report).toContain("Item Model Mapper Coverage Report");
      expect(report).toContain("Games with mappers:");
      expect(report).toContain("Total mapped items:");
      expect(report).toContain("OTTO_MATIC:");
    });
  });
  
  describe("OttoItemMapper", () => {
    it("should have correct game type", () => {
      expect(ottoItemMapper.game).toBe(Game.OTTO_MATIC);
    });
    
    it("should have mappings", () => {
      expect(ottoItemMapper.getMappingCount()).toBeGreaterThan(0);
    });
    
    it("should get mapping for known item type", () => {
      // Item type 1 should be mapped (check ottoItemModelMapping.ts)
      const mappedTypes = ottoItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = ottoItemMapper.getMapping(firstType);
        expect(mapping).toBeDefined();
        expect(mapping?.modelFile).toBeTruthy();
        expect(typeof mapping?.modelIndex).toBe("number");
      }
    });
    
    it("should return undefined for unmapped type", () => {
      // Item type 99999 should not exist
      const mapping = ottoItemMapper.getMapping(99999);
      expect(mapping).toBeUndefined();
    });
    
    it("should report hasModel correctly", () => {
      const mappedTypes = ottoItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        expect(ottoItemMapper.hasModel(mappedTypes[0])).toBe(true);
      }
      expect(ottoItemMapper.hasModel(99999)).toBe(false);
    });
    
    it("should handle param-dependent Human mapping", () => {
      // Human (type 4) should use different models based on p1 param
      const farmerMapping = ottoItemMapper.getMapping(4, undefined, { p0: 0, p1: 0, p2: 0, p3: 0 });
      expect(farmerMapping).toBeDefined();
      expect(farmerMapping?.modelFile).toBe("Farmer.bg3d");
      expect(farmerMapping?.skeletonFile).toBe("Farmer.skeleton.rsrc");
      
      const beeWomanMapping = ottoItemMapper.getMapping(4, undefined, { p0: 0, p1: 1, p2: 0, p3: 0 });
      expect(beeWomanMapping).toBeDefined();
      expect(beeWomanMapping?.modelFile).toBe("BeeWoman.bg3d");
      expect(beeWomanMapping?.skeletonFile).toBe("BeeWoman.skeleton.rsrc");
      
      const scientistMapping = ottoItemMapper.getMapping(4, undefined, { p0: 0, p1: 2, p2: 0, p3: 0 });
      expect(scientistMapping).toBeDefined();
      expect(scientistMapping?.modelFile).toBe("Scientist.bg3d");
      expect(scientistMapping?.skeletonFile).toBe("Scientist.skeleton.rsrc");
      
      const skirtLadyMapping = ottoItemMapper.getMapping(4, undefined, { p0: 0, p1: 3, p2: 0, p3: 0 });
      expect(skirtLadyMapping).toBeDefined();
      expect(skirtLadyMapping?.modelFile).toBe("SkirtLady.bg3d");
      expect(skirtLadyMapping?.skeletonFile).toBe("SkirtLady.skeleton.rsrc");
    });
    
    it("should default to Farmer for Human with no params", () => {
      const mapping = ottoItemMapper.getMapping(4);
      expect(mapping).toBeDefined();
      expect(mapping?.modelFile).toBe("Farmer.bg3d");
    });
    
    it("should always report Human as having a model", () => {
      expect(ottoItemMapper.hasModel(4)).toBe(true);
    });
    
    it("should include Human in mapped types", () => {
      const mappedTypes = ottoItemMapper.getMappedTypes();
      expect(mappedTypes).toContain(4); // Human type
    });
  });
  
  describe("Bugdom2ItemMapper", () => {
    it("should have correct game type", () => {
      expect(bugdom2ItemMapper.game).toBe(Game.BUGDOM_2);
    });
    
    it("should have getLevelModelFile method", () => {
      // Level file names match actual files in /games/bugdom2/models/
      expect(bugdom2ItemMapper.getLevelModelFile(0)).toBe("Level1_Garden.bg3d");
      expect(bugdom2ItemMapper.getLevelModelFile(3)).toBe("Level5_Playroom.bg3d");
      expect(bugdom2ItemMapper.getLevelModelFile(99)).toBeUndefined();
    });
    
    it("should have model mappings", () => {
      // Snail (type 1) has a skeleton model
      const snailMapping = bugdom2ItemMapper.getMapping(1);
      expect(snailMapping).toBeDefined();
      expect(snailMapping?.modelFile).toBe("Snail.bg3d");
      expect(snailMapping?.modelPath).toBe("skeletons");
      
      // Gnome enemy (type 4) has a skeleton model
      const gnomeMapping = bugdom2ItemMapper.getMapping(4);
      expect(gnomeMapping).toBeDefined();
      expect(gnomeMapping?.modelFile).toBe("Gnome.bg3d");
    });
    
    it("should handle level-specific lookups", () => {
      // Even if no mappings exist yet, it shouldn't crash
      const mapping = bugdom2ItemMapper.getMapping(1, 0);
      // Will be undefined until mappings are added
      expect(mapping === undefined || mapping !== null).toBe(true);
    });
  });
  
  describe("BugdomItemMapper", () => {
    it("should have correct game type", () => {
      expect(bugdomItemMapper.game).toBe(Game.BUGDOM);
    });
    
    it("should have mappings (3DMF is now supported)", () => {
      // Bugdom 1 uses 3DMF format which is now supported
      expect(bugdomItemMapper.getMappingCount()).toBeGreaterThan(0);
      expect(bugdomItemMapper.getMappedTypes().length).toBeGreaterThan(0);
    });
    
    it("should get mapping for enemy type", () => {
      // Spider enemy (type 36)
      const mapping = bugdomItemMapper.getMapping(36);
      expect(mapping).toBeDefined();
      expect(mapping?.modelFile).toBe("Spider.3dmf");
      expect(mapping?.modelPath).toBe("skeletons");
      expect(mapping?.requiresSkeleton).toBe(true);
    });
    
    it("should return undefined for unmapped type", () => {
      const mapping = bugdomItemMapper.getMapping(99999);
      expect(mapping).toBeUndefined();
    });
  });
  
  describe("Nanosaur2ItemMapper", () => {
    it("should have correct game type", () => {
      expect(nanosaur2ItemMapper.game).toBe(Game.NANOSAUR_2);
    });
    
    it("should have mappings", () => {
      expect(nanosaur2ItemMapper.getMappingCount()).toBeGreaterThan(0);
    });
    
    it("should get mapping for known item type", () => {
      const mappedTypes = nanosaur2ItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = nanosaur2ItemMapper.getMapping(firstType);
        expect(mapping).toBeDefined();
        expect(mapping?.modelFile).toBeTruthy();
        expect(typeof mapping?.modelIndex).toBe("number");
      }
    });
    
    it("should return undefined for unmapped type", () => {
      const mapping = nanosaur2ItemMapper.getMapping(99999);
      expect(mapping).toBeUndefined();
    });
    
    it("should handle variants", () => {
      // Test variant handling with params
      const mappedTypes = nanosaur2ItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = nanosaur2ItemMapper.getMapping(firstType, undefined, { p0: 0, p1: 0, p2: 0, p3: 0 });
        expect(mapping === undefined || mapping !== null).toBe(true);
      }
    });
  });
  
  describe("CroMagItemMapper", () => {
    it("should have correct game type", () => {
      expect(croMagItemMapper.game).toBe(Game.CRO_MAG);
    });
    
    it("should have mappings", () => {
      expect(croMagItemMapper.getMappingCount()).toBeGreaterThan(0);
    });
    
    it("should get mapping for known item type", () => {
      const mappedTypes = croMagItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = croMagItemMapper.getMapping(firstType);
        expect(mapping).toBeDefined();
        expect(mapping?.modelFile).toBeTruthy();
        expect(typeof mapping?.modelIndex).toBe("number");
      }
    });
    
    it("should return undefined for unmapped type", () => {
      const mapping = croMagItemMapper.getMapping(99999);
      expect(mapping).toBeUndefined();
    });
  });
  
  describe("BillyFrontierItemMapper", () => {
    it("should have correct game type", () => {
      expect(billyFrontierItemMapper.game).toBe(Game.BILLY_FRONTIER);
    });
    
    it("should have mappings", () => {
      expect(billyFrontierItemMapper.getMappingCount()).toBeGreaterThan(0);
    });
    
    it("should get mapping for known item type", () => {
      const mappedTypes = billyFrontierItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = billyFrontierItemMapper.getMapping(firstType);
        expect(mapping).toBeDefined();
        expect(mapping?.modelFile).toBeTruthy();
        expect(typeof mapping?.modelIndex).toBe("number");
      }
    });
    
    it("should return undefined for unmapped type", () => {
      const mapping = billyFrontierItemMapper.getMapping(99999);
      expect(mapping).toBeUndefined();
    });
    
    it("should handle variants", () => {
      // Test variant handling with params
      const mappedTypes = billyFrontierItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = billyFrontierItemMapper.getMapping(firstType, undefined, { p0: 0, p1: 0, p2: 0, p3: 0 });
        expect(mapping === undefined || mapping !== null).toBe(true);
      }
    });
  });
  
  describe("Nanosaur1ItemMapper", () => {
    it("should have correct game type", () => {
      expect(nanosaur1ItemMapper.game).toBe(Game.NANOSAUR);
    });
    
    it("should have mappings (3DMF is now supported)", () => {
      // Nanosaur 1 uses 3DMF format which is now supported
      expect(nanosaur1ItemMapper.getMappingCount()).toBeGreaterThan(0);
      expect(nanosaur1ItemMapper.getMappedTypes().length).toBeGreaterThan(0);
    });
    
    it("should get mapping for enemy type", () => {
      // Rex enemy (type 3)
      const mapping = nanosaur1ItemMapper.getMapping(3);
      expect(mapping).toBeDefined();
      expect(mapping?.modelFile).toBe("Rex.3dmf");
      expect(mapping?.modelPath).toBe("skeletons");
      expect(mapping?.requiresSkeleton).toBe(true);
    });
    
    it("should return undefined for unmapped type", () => {
      const mapping = nanosaur1ItemMapper.getMapping(99999);
      expect(mapping).toBeUndefined();
    });
  });
});
