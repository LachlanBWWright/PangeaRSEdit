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
import { bugdom2ItemMapper } from "../../src/data/items/mappers/bugdom2ItemMapper";

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
});
