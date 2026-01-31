/**
 * Tests for Item Model Types
 */

import { describe, it, expect } from "vitest";
import { Game } from "../../src/data/globals/globals";
import {
  GAME_MODEL_REGISTRIES,
  ITEM_CATEGORY_COLORS,
  getCategoryColor,
  getModelRegistry,
  gameHasModelSupport,
  getGamesWithModelSupport,
  getFullModelPath,
  type ItemCategory,
} from "../../src/data/items/itemModelTypes";

describe("itemModelTypes", () => {
  describe("GAME_MODEL_REGISTRIES", () => {
    it("should have registry for Otto Matic", () => {
      const registry = GAME_MODEL_REGISTRIES[Game.OTTO_MATIC];
      expect(registry).toBeDefined();
      expect(registry?.game).toBe(Game.OTTO_MATIC);
      expect(registry?.globalModels).toContain("global.bg3d");
    });
    
    it("should have registry for Bugdom 2", () => {
      const registry = GAME_MODEL_REGISTRIES[Game.BUGDOM_2];
      expect(registry).toBeDefined();
      expect(registry?.game).toBe(Game.BUGDOM_2);
      expect(registry?.levelModels[0]).toContain("garden.bg3d");
    });
    
    it("should have registry for Bugdom 1", () => {
      const registry = GAME_MODEL_REGISTRIES[Game.BUGDOM];
      expect(registry).toBeDefined();
      expect(registry?.globalModels).toContain("global1.bg3d");
    });
    
    it("should have correct level models for Otto Matic", () => {
      const registry = GAME_MODEL_REGISTRIES[Game.OTTO_MATIC];
      expect(registry?.levelModels[1]).toContain("level1_farm.bg3d");
      expect(registry?.levelModels[5]).toContain("level5_cloud.bg3d");
      expect(registry?.levelModels[10]).toContain("level10_brainboss.bg3d");
    });
  });
  
  describe("ITEM_CATEGORY_COLORS", () => {
    it("should have colors for all categories", () => {
      const categories: ItemCategory[] = [
        "enemy", "powerup", "environmental", "trigger", "player", "decoration", "unknown"
      ];
      
      for (const category of categories) {
        expect(ITEM_CATEGORY_COLORS[category]).toBeDefined();
        expect(typeof ITEM_CATEGORY_COLORS[category]).toBe("number");
      }
    });
    
    it("should have red for enemies", () => {
      expect(ITEM_CATEGORY_COLORS.enemy).toBe(0xff4444);
    });
    
    it("should have green for powerups", () => {
      expect(ITEM_CATEGORY_COLORS.powerup).toBe(0x44ff44);
    });
    
    it("should have gray for unknown", () => {
      expect(ITEM_CATEGORY_COLORS.unknown).toBe(0xaaaaaa);
    });
  });
  
  describe("getCategoryColor", () => {
    it("should return correct color for category", () => {
      expect(getCategoryColor("enemy")).toBe(0xff4444);
      expect(getCategoryColor("powerup")).toBe(0x44ff44);
      expect(getCategoryColor("trigger")).toBe(0xffff44);
    });
  });
  
  describe("getModelRegistry", () => {
    it("should return registry for supported games", () => {
      expect(getModelRegistry(Game.OTTO_MATIC)).toBeDefined();
      expect(getModelRegistry(Game.BUGDOM_2)).toBeDefined();
      expect(getModelRegistry(Game.BILLY_FRONTIER)).toBeDefined();
    });
    
    it("should return undefined for unsupported games", () => {
      // Mighty Mike doesn't have 3D models (it's 2D)
      expect(getModelRegistry(Game.MIGHTY_MIKE)).toBeUndefined();
      // Nanosaur 1 is tile-based, may not have registry
      expect(getModelRegistry(Game.NANOSAUR)).toBeUndefined();
    });
  });
  
  describe("gameHasModelSupport", () => {
    it("should return true for games with registries", () => {
      expect(gameHasModelSupport(Game.OTTO_MATIC)).toBe(true);
      expect(gameHasModelSupport(Game.BUGDOM_2)).toBe(true);
      expect(gameHasModelSupport(Game.CRO_MAG_RALLY)).toBe(true);
    });
    
    it("should return false for games without registries", () => {
      expect(gameHasModelSupport(Game.MIGHTY_MIKE)).toBe(false);
    });
  });
  
  describe("getGamesWithModelSupport", () => {
    it("should return array of supported games", () => {
      const games = getGamesWithModelSupport();
      expect(Array.isArray(games)).toBe(true);
      expect(games.length).toBeGreaterThan(0);
      expect(games).toContain(Game.OTTO_MATIC);
      expect(games).toContain(Game.BUGDOM_2);
    });
    
    it("should not include games without model support", () => {
      const games = getGamesWithModelSupport();
      expect(games).not.toContain(Game.MIGHTY_MIKE);
    });
  });
  
  describe("getFullModelPath", () => {
    it("should construct correct model path", () => {
      const registry = GAME_MODEL_REGISTRIES[Game.OTTO_MATIC];
      if (!registry) throw new Error("Registry not found");
      
      const path = getFullModelPath(registry, "global.bg3d", "models");
      expect(path).toBe("games/ottomatic/models/global.bg3d");
    });
    
    it("should construct correct skeleton path", () => {
      const registry = GAME_MODEL_REGISTRIES[Game.OTTO_MATIC];
      if (!registry) throw new Error("Registry not found");
      
      const path = getFullModelPath(registry, "Otto.bg3d", "skeletons");
      expect(path).toBe("games/ottomatic/skeletons/Otto.bg3d");
    });
    
    it("should work with Bugdom 2 paths", () => {
      const registry = GAME_MODEL_REGISTRIES[Game.BUGDOM_2];
      if (!registry) throw new Error("Registry not found");
      
      const path = getFullModelPath(registry, "garden.bg3d", "models");
      expect(path).toBe("games/bugdom2/models/garden.bg3d");
    });
  });
});
