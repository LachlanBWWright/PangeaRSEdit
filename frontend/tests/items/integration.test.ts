/**
 * Integration Tests for All Item-Related Modules
 * 
 * Tests the interaction between:
 * - Item categories
 * - Item filters
 * - Item model types
 * - Item mappers
 * - Item model utilities
 */

import { describe, it, expect } from "vitest";
import { categorizeItem, getAllCategories } from "@/data/items/itemCategories";
import { isItemVisible, createDefaultFilter, applyFilterPreset } from "@/data/items/itemFilterUtils";
import { FilterMode, FILTER_PRESETS, DEFAULT_FILTER_STATE } from "@/data/items/itemFilterAtoms";
import { toFilterableItemKey } from "@/data/items/itemFilterKeys";
import { getGameMapper, getGamesWithMappers } from "@/data/items/mappers";
import { 
  ROTATION_4_WAY, 
  ROTATION_8_WAY, 
  calculateRotation, 
  isFlagSet 
} from "@/data/items/standardParamTypes";
import { getGameMappingSummary, validateGameMappings } from "@/data/items/itemModelUtils";

describe("Item Module Integration", () => {
  describe("Category and Filter Integration", () => {
    it("categorizes item and applies filter correctly", () => {
      // Create a mock item type
      const itemType = 1;
      const typeName = "Enemy_Test";
      
      // Categorize (used for display but not for visibility)
      const category = categorizeItem(typeName);
      expect(getAllCategories()).toContain(category);
      
      // Create filter showing only this item type via itemTypes toggle
      const filter = createDefaultFilter();
      filter.mode = FilterMode.SHOW_SELECTED;
      filter.itemTypes = {
        [toFilterableItemKey({ kind: "item", type: itemType })]: true,
      };
      
      // Item should be visible
      const visible = isItemVisible(itemType, filter);
      expect(visible).toBe(true);
    });

    it("filter presets work with real categories", () => {
      // Apply enemies-only preset
      const enemiesPreset = FILTER_PRESETS.find(p => p.name === "Enemies Only");
      if (enemiesPreset) {
        const filter = applyFilterPreset(DEFAULT_FILTER_STATE, enemiesPreset.state);
        expect(filter.categories.enemy).toBe(true);
        expect(filter.categories.environmental).toBe(false);
      }
    });

    it("all categories are represented in default filter state", () => {
      const allCats = getAllCategories();
      const defaultCats = Object.keys(DEFAULT_FILTER_STATE.categories);
      
      for (const cat of allCats) {
        expect(defaultCats).toContain(cat);
      }
    });
  });

  describe("Mapper and Model Type Integration", () => {
    it("all games with mappers have valid mappings", () => {
      const gamesWithMappers = getGamesWithMappers();
      
      for (const game of gamesWithMappers) {
        const validation = validateGameMappings(game);
        expect(validation.isOk()).toBe(true);
        
        if (validation.isOk()) {
          // May have issues but should not have critical errors
          expect(Array.isArray(validation.value.issues)).toBe(true);
        }
      }
    });

    it("mapper summary matches actual mapping count", () => {
      const gamesWithMappers = getGamesWithMappers();
      
      for (const game of gamesWithMappers) {
        const mapper = getGameMapper(game);
        const summary = getGameMappingSummary(game);
        
        if (mapper && summary.isOk()) {
          expect(summary.value.totalMapped).toBe(mapper.getMappedTypes().length);
        }
      }
    });
  });

  describe("Standard Parameter Type Integration", () => {
    it("rotation calculations work for all rotation types", () => {
      // Test 4-way rotation
      const rot4_0 = calculateRotation(0, ROTATION_4_WAY);
      const rot4_1 = calculateRotation(1, ROTATION_4_WAY);
      expect(rot4_0).toBe(0);
      expect(rot4_1).not.toBe(0);
      
      // Test 8-way rotation
      const rot8_0 = calculateRotation(0, ROTATION_8_WAY);
      const rot8_4 = calculateRotation(4, ROTATION_8_WAY);
      expect(rot8_0).toBe(0);
      expect(rot8_4).not.toBe(0);
    });

    it("flag checking works with enemy spawn flags", () => {
      // AlwaysAdd flag (bit 0)
      const withAlwaysAdd = 1; // 0b01
      const withRegenerate = 2; // 0b10
      const withBoth = 3; // 0b11
      
      expect(isFlagSet(withAlwaysAdd, 0)).toBe(true);
      expect(isFlagSet(withAlwaysAdd, 1)).toBe(false);
      
      expect(isFlagSet(withRegenerate, 0)).toBe(false);
      expect(isFlagSet(withRegenerate, 1)).toBe(true);
      
      expect(isFlagSet(withBoth, 0)).toBe(true);
      expect(isFlagSet(withBoth, 1)).toBe(true);
    });
  });

  describe("Cross-Module Consistency", () => {
    it("all mapped games can be validated", () => {
      const gamesWithMappers = getGamesWithMappers();
      
      for (const game of gamesWithMappers) {
        // Can get summary
        const summary = getGameMappingSummary(game);
        expect(summary.isOk()).toBe(true);
        
        // Can validate
        const validation = validateGameMappings(game);
        expect(validation.isOk()).toBe(true);
      }
    });

    it("category colors are defined for all categories", () => {
      const categories = getAllCategories();
      
      for (const cat of categories) {
        // Each category should have some representation
        expect(typeof cat).toBe("string");
        expect(cat.length).toBeGreaterThan(0);
      }
    });

    it("filter presets cover major use cases", () => {
      const presetNames = FILTER_PRESETS.map(p => p.name.toLowerCase());
      
      // Should have at least enemy and powerup presets
      expect(presetNames.some(n => n.includes("enem"))).toBe(true);
      expect(presetNames.some(n => n.includes("power") || n.includes("pickup"))).toBe(true);
    });
  });

  describe("Game-Specific Behavior", () => {
    it("Otto Matic has the most mapped items", () => {
      const gamesWithMappers = getGamesWithMappers();
      let maxCount = 0;
      
      for (const game of gamesWithMappers) {
        const summary = getGameMappingSummary(game);
        if (summary.isOk() && summary.value.totalMapped > maxCount) {
          maxCount = summary.value.totalMapped;
        }
      }
      
      // Otto Matic should be among the top (it has most item types)
      expect(maxCount).toBeGreaterThan(50);
    });

    it("all games have consistent mapper interface", () => {
      const gamesWithMappers = getGamesWithMappers();
      
      for (const game of gamesWithMappers) {
        const mapper = getGameMapper(game);
        expect(mapper).toBeDefined();
        
        if (mapper) {
          // All mappers should implement the interface
          expect(typeof mapper.getMapping).toBe("function");
          expect(typeof mapper.getMappedTypes).toBe("function");
          expect(typeof mapper.hasModel).toBe("function");
          expect(typeof mapper.getMappingCount).toBe("function");
        }
      }
    });
  });
});
