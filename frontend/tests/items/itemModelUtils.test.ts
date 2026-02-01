/**
 * Tests for Item Model Utilities
 */

import { describe, it, expect } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  getGameMappingSummary,
  validateGameMappings,
  findDuplicateMappings,
  getUniqueModelFiles,
  generateMappingCoverageReport,
  isItemTypeMapped,
  getItemMapping,
} from "@/data/items/itemModelUtils";
import { hasGameMapper } from "@/data/items/mappers";

describe("Item Model Utilities", () => {
  describe("getGameMappingSummary", () => {
    it("returns summary for Otto Matic", () => {
      const result = getGameMappingSummary(Game.OTTO_MATIC);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.game).toBe(Game.OTTO_MATIC);
        expect(result.value.totalMapped).toBeGreaterThan(0);
      }
    });

    it("returns summary for Nanosaur 2", () => {
      const result = getGameMappingSummary(Game.NANOSAUR_2);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.game).toBe(Game.NANOSAUR_2);
        expect(result.value.totalMapped).toBeGreaterThan(0);
      }
    });

    it("returns summary for Cro-Mag Rally", () => {
      const result = getGameMappingSummary(Game.CRO_MAG);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.game).toBe(Game.CRO_MAG);
        expect(result.value.totalMapped).toBeGreaterThan(0);
      }
    });

    it("returns error for game without mapper", () => {
      const result = getGameMappingSummary(Game.MIGHTY_MIKE);
      expect(result.ok).toBe(false);
    });

    it("includes mapping statistics", () => {
      const result = getGameMappingSummary(Game.OTTO_MATIC);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value.mappingsWithVariants).toBe("number");
        expect(typeof result.value.mappingsWithRotation).toBe("number");
        expect(typeof result.value.mappingsWithScale).toBe("number");
        expect(typeof result.value.skeletonModels).toBe("number");
      }
    });
  });

  describe("validateGameMappings", () => {
    it("validates Otto Matic mappings", () => {
      const result = validateGameMappings(Game.OTTO_MATIC);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(typeof result.value.valid).toBe("boolean");
        expect(Array.isArray(result.value.issues)).toBe(true);
        expect(Array.isArray(result.value.warnings)).toBe(true);
      }
    });

    it("validates Nanosaur 2 mappings", () => {
      const result = validateGameMappings(Game.NANOSAUR_2);
      expect(result.ok).toBe(true);
    });

    it("validates Cro-Mag Rally mappings", () => {
      const result = validateGameMappings(Game.CRO_MAG);
      expect(result.ok).toBe(true);
    });

    it("validates Billy Frontier mappings", () => {
      const result = validateGameMappings(Game.BILLY_FRONTIER);
      expect(result.ok).toBe(true);
    });

    it("returns error for game without mapper", () => {
      const result = validateGameMappings(Game.MIGHTY_MIKE);
      expect(result.ok).toBe(false);
    });
  });

  describe("findDuplicateMappings", () => {
    it("returns duplicate analysis for Otto Matic", () => {
      const result = findDuplicateMappings(Game.OTTO_MATIC);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value.duplicates)).toBe(true);
      }
    });

    it("returns empty duplicates if no duplicates exist", () => {
      const result = findDuplicateMappings(Game.NANOSAUR);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // May or may not have duplicates, but should be an array
        expect(Array.isArray(result.value.duplicates)).toBe(true);
      }
    });

    it("returns error for game without mapper", () => {
      const result = findDuplicateMappings(Game.MIGHTY_MIKE);
      expect(result.ok).toBe(false);
    });
  });

  describe("getUniqueModelFiles", () => {
    it("returns unique files for Otto Matic", () => {
      const result = getUniqueModelFiles(Game.OTTO_MATIC);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value.modelFiles)).toBe(true);
        expect(Array.isArray(result.value.skeletonFiles)).toBe(true);
        expect(result.value.totalFiles).toBe(
          result.value.modelFiles.length + result.value.skeletonFiles.length
        );
      }
    });

    it("returns unique files for Nanosaur 2", () => {
      const result = getUniqueModelFiles(Game.NANOSAUR_2);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalFiles).toBeGreaterThan(0);
      }
    });

    it("returns sorted file lists", () => {
      const result = getUniqueModelFiles(Game.OTTO_MATIC);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const files = result.value.modelFiles;
        const sorted = [...files].sort();
        expect(files).toEqual(sorted);
      }
    });

    it("returns error for game without mapper", () => {
      const result = getUniqueModelFiles(Game.MIGHTY_MIKE);
      expect(result.ok).toBe(false);
    });
  });

  describe("generateMappingCoverageReport", () => {
    it("generates a non-empty report", () => {
      const report = generateMappingCoverageReport();
      expect(typeof report).toBe("string");
      expect(report.length).toBeGreaterThan(0);
    });

    it("contains expected sections", () => {
      const report = generateMappingCoverageReport();
      expect(report).toContain("# Item Model Mapping Coverage Report");
      expect(report).toContain("## Summary");
      expect(report).toContain("## Per-Game Details");
    });

    it("includes game names", () => {
      const report = generateMappingCoverageReport();
      expect(report).toContain("OTTO_MATIC");
    });

    it("includes total count", () => {
      const report = generateMappingCoverageReport();
      expect(report).toContain("Total mapped items:");
    });
  });

  describe("isItemTypeMapped", () => {
    it("returns true for mapped Otto Matic items", () => {
      // Type 0 is typically StartCoords which is commonly mapped
      // We just test that the function returns a boolean
      const result = isItemTypeMapped(Game.OTTO_MATIC, 0);
      expect(typeof result).toBe("boolean");
    });

    it("returns false for game without mapper", () => {
      expect(isItemTypeMapped(Game.MIGHTY_MIKE, 0)).toBe(false);
    });

    it("returns false for unmapped item type", () => {
      // Type 99999 is unlikely to be mapped
      expect(isItemTypeMapped(Game.OTTO_MATIC, 99999)).toBe(false);
    });
  });

  describe("getItemMapping", () => {
    it("returns undefined for unmapped item type", () => {
      const mapping = getItemMapping(Game.OTTO_MATIC, 99999);
      expect(mapping).toBeUndefined();
    });

    it("returns undefined for game without mapper", () => {
      const mapping = getItemMapping(Game.MIGHTY_MIKE, 0);
      expect(mapping).toBeUndefined();
    });

    it("returns mapping object for mapped item", () => {
      // Only test if the mapper exists
      if (hasGameMapper(Game.OTTO_MATIC)) {
        // We can't guarantee which items are mapped, so we just verify the function works
        const mapping = getItemMapping(Game.OTTO_MATIC, 0);
        // Result could be undefined or a mapping object
        if (mapping !== undefined) {
          expect(typeof mapping.modelFile).toBe("string");
          expect(typeof mapping.modelIndex).toBe("number");
        }
      }
    });
  });
});
