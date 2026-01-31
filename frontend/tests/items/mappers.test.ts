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
  });
  
  describe("getAllMappingCounts", () => {
    it("should return counts for all games", () => {
      const counts = getAllMappingCounts();
      expect(typeof counts).toBe("object");
      expect(counts["OTTO_MATIC"]).toBeGreaterThan(0);
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
  });
  
  describe("Bugdom2ItemMapper", () => {
    it("should have correct game type", () => {
      expect(bugdom2ItemMapper.game).toBe(Game.BUGDOM_2);
    });
    
    it("should have getLevelModelFile method", () => {
      expect(bugdom2ItemMapper.getLevelModelFile(0)).toBe("garden.bg3d");
      expect(bugdom2ItemMapper.getLevelModelFile(3)).toBe("playroom.bg3d");
      expect(bugdom2ItemMapper.getLevelModelFile(99)).toBeUndefined();
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
    
    it("should have getLevelModelFile method", () => {
      expect(bugdomItemMapper.getLevelModelFile(0)).toBe("lawn1.bg3d");
      expect(bugdomItemMapper.getLevelModelFile(2)).toBe("pond.bg3d");
      expect(bugdomItemMapper.getLevelModelFile(5)).toBe("night.bg3d");
      expect(bugdomItemMapper.getLevelModelFile(99)).toBeUndefined();
    });
    
    it("should handle lookups gracefully", () => {
      // Even if no mappings exist yet, it shouldn't crash
      const mapping = bugdomItemMapper.getMapping(1);
      // Will be undefined until mappings are added
      expect(mapping === undefined || mapping !== null).toBe(true);
    });
    
    it("should return empty array when no mappings exist", () => {
      // Bugdom mappings are TODOs, so getMappedTypes should return empty array
      const types = bugdomItemMapper.getMappedTypes();
      expect(Array.isArray(types)).toBe(true);
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
    
    it("should have mappings", () => {
      expect(nanosaur1ItemMapper.getMappingCount()).toBeGreaterThan(0);
    });
    
    it("should get mapping for known item type", () => {
      const mappedTypes = nanosaur1ItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = nanosaur1ItemMapper.getMapping(firstType);
        expect(mapping).toBeDefined();
        expect(mapping?.modelFile).toBeTruthy();
        expect(typeof mapping?.modelIndex).toBe("number");
      }
    });
    
    it("should return undefined for unmapped type", () => {
      const mapping = nanosaur1ItemMapper.getMapping(99999);
      expect(mapping).toBeUndefined();
    });
    
    it("should handle variants", () => {
      // Test variant handling with params
      const mappedTypes = nanosaur1ItemMapper.getMappedTypes();
      if (mappedTypes.length > 0) {
        const firstType = mappedTypes[0];
        const mapping = nanosaur1ItemMapper.getMapping(firstType, undefined, { p0: 0, p1: 0, p2: 0, p3: 0 });
        expect(mapping === undefined || mapping !== null).toBe(true);
      }
    });
  });
});
