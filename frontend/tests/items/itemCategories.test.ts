import { describe, it, expect } from "vitest";
import {
  ItemCategory,
  categorizeItem,
  getCategoryDisplayName,
  getCategoryColor,
  getAllCategories,
} from "@/data/items/itemCategories";

describe("Item Categories", () => {
  describe("categorizeItem", () => {
    it("should categorize enemy items", () => {
      expect(categorizeItem("Enemy_Squooshy")).toBe(ItemCategory.ENEMY);
      expect(categorizeItem("Enemy_BrainAlien")).toBe(ItemCategory.ENEMY);
      expect(categorizeItem("Enemy_Clown")).toBe(ItemCategory.ENEMY);
      expect(categorizeItem("Walker")).toBe(ItemCategory.ENEMY);
    });

    it("should categorize powerup items", () => {
      expect(categorizeItem("PowerupPod")).toBe(ItemCategory.POWERUP);
      expect(categorizeItem("POW_Health")).toBe(ItemCategory.POWERUP);
      expect(categorizeItem("HealthPack")).toBe(ItemCategory.POWERUP);
      expect(categorizeItem("Coin")).toBe(ItemCategory.POWERUP);
      expect(categorizeItem("GoldenClover")).toBe(ItemCategory.POWERUP);
    });

    it("should categorize trigger items", () => {
      expect(categorizeItem("TriggerZone")).toBe(ItemCategory.TRIGGER);
      expect(categorizeItem("Checkpoint")).toBe(ItemCategory.TRIGGER);
      expect(categorizeItem("Gate")).toBe(ItemCategory.TRIGGER);
      expect(categorizeItem("Teleporter")).toBe(ItemCategory.TRIGGER);
    });

    it("should categorize player items", () => {
      expect(categorizeItem("StartCoords")).toBe(ItemCategory.PLAYER);
      expect(categorizeItem("ExitRocket")).toBe(ItemCategory.PLAYER);
      expect(categorizeItem("PlayerStart")).toBe(ItemCategory.PLAYER);
      expect(categorizeItem("CameraPoint")).toBe(ItemCategory.PLAYER);
    });

    it("should categorize environmental items", () => {
      expect(categorizeItem("Plant_Fern")).toBe(ItemCategory.ENVIRONMENTAL);
      expect(categorizeItem("Tree_Oak")).toBe(ItemCategory.ENVIRONMENTAL);
      expect(categorizeItem("RockSmall")).toBe(ItemCategory.ENVIRONMENTAL);
      expect(categorizeItem("Bush")).toBe(ItemCategory.ENVIRONMENTAL);
      expect(categorizeItem("Decoration")).toBe(ItemCategory.ENVIRONMENTAL);
    });

    it("should return UNKNOWN for unrecognized items", () => {
      expect(categorizeItem("SomeRandomItem")).toBe(ItemCategory.UNKNOWN);
      expect(categorizeItem("XYZ123")).toBe(ItemCategory.UNKNOWN);
    });
  });

  describe("getCategoryDisplayName", () => {
    it("should return correct display names", () => {
      expect(getCategoryDisplayName(ItemCategory.ENEMY)).toBe("Enemies");
      expect(getCategoryDisplayName(ItemCategory.POWERUP)).toBe("Powerups");
      expect(getCategoryDisplayName(ItemCategory.ENVIRONMENTAL)).toBe("Environmental");
      expect(getCategoryDisplayName(ItemCategory.TRIGGER)).toBe("Triggers");
      expect(getCategoryDisplayName(ItemCategory.PLAYER)).toBe("Player/Spawns");
      expect(getCategoryDisplayName(ItemCategory.UNKNOWN)).toBe("Uncategorized");
    });
  });

  describe("getCategoryColor", () => {
    it("should return color classes for all categories", () => {
      expect(getCategoryColor(ItemCategory.ENEMY)).toContain("bg-");
      expect(getCategoryColor(ItemCategory.POWERUP)).toContain("bg-");
      expect(getCategoryColor(ItemCategory.ENVIRONMENTAL)).toContain("bg-");
      expect(getCategoryColor(ItemCategory.TRIGGER)).toContain("bg-");
      expect(getCategoryColor(ItemCategory.PLAYER)).toContain("bg-");
      expect(getCategoryColor(ItemCategory.UNKNOWN)).toContain("bg-");
    });
  });

  describe("getAllCategories", () => {
    it("should return all category values", () => {
      const categories = getAllCategories();
      expect(categories).toContain(ItemCategory.ENEMY);
      expect(categories).toContain(ItemCategory.POWERUP);
      expect(categories).toContain(ItemCategory.ENVIRONMENTAL);
      expect(categories).toContain(ItemCategory.TRIGGER);
      expect(categories).toContain(ItemCategory.PLAYER);
      expect(categories).toContain(ItemCategory.UNKNOWN);
      expect(categories).toHaveLength(6);
    });
  });
});
