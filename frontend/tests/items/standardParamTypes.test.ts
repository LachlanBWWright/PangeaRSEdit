/**
 * Tests for Standard Parameter Types
 */

import { describe, it, expect } from "vitest";
import {
  ROTATION_4_WAY,
  ROTATION_8_WAY,
  ROTATION_16_WAY,
  ROTATION_CONTINUOUS,
  SCALE_ADDITIVE,
  SCALE_DIRECT,
  ENEMY_SPAWN_FLAGS,
  TRIGGER_FLAGS,
  SPLINE_ID,
  calculateRotation,
  calculateScale,
  getSelectedTypeName,
  isFlagSet,
  getSetFlags,
  timerToSeconds,
  isRotationParam,
  isScaleParam,
  isTypeSelectorParam,
  isBitFlagsParam,
  isIdParam,
  isCountParam,
  isTimerParam,
  isSpeedParam,
  isCoordinateParam,
  type TypeSelectorParam,
  type TimerParam,
  type CountParam,
  type SpeedParam,
  type CoordinateParam,
} from "../../src/data/items/standardParamTypes";

describe("standardParamTypes", () => {
  describe("Pre-defined Rotation Parameters", () => {
    it("ROTATION_4_WAY should have 4 divisions", () => {
      expect(ROTATION_4_WAY.divisions).toBe(4);
      expect(ROTATION_4_WAY.type).toBe("Rotation");
    });
    
    it("ROTATION_8_WAY should have 8 divisions", () => {
      expect(ROTATION_8_WAY.divisions).toBe(8);
      expect(ROTATION_8_WAY.type).toBe("Rotation");
    });
    
    it("ROTATION_16_WAY should have 16 divisions", () => {
      expect(ROTATION_16_WAY.divisions).toBe(16);
      expect(ROTATION_16_WAY.type).toBe("Rotation");
    });
    
    it("ROTATION_CONTINUOUS should have 65536 divisions", () => {
      expect(ROTATION_CONTINUOUS.divisions).toBe(65536);
      expect(ROTATION_CONTINUOUS.type).toBe("Rotation");
    });
  });
  
  describe("Pre-defined Scale Parameters", () => {
    it("SCALE_ADDITIVE should have correct defaults", () => {
      expect(SCALE_ADDITIVE.type).toBe("Scale");
      expect(SCALE_ADDITIVE.defaultValue).toBe(1);
      expect(SCALE_ADDITIVE.scaleFactor).toBe(0.1);
    });
    
    it("SCALE_DIRECT should have correct defaults", () => {
      expect(SCALE_DIRECT.type).toBe("Scale");
      expect(SCALE_DIRECT.defaultValue).toBe(1);
      expect(SCALE_DIRECT.scaleFactor).toBe(1);
    });
  });
  
  describe("Pre-defined Flag Parameters", () => {
    it("ENEMY_SPAWN_FLAGS should have expected flags", () => {
      expect(ENEMY_SPAWN_FLAGS.type).toBe("BitFlags");
      expect(ENEMY_SPAWN_FLAGS.flags.length).toBe(3);
      expect(ENEMY_SPAWN_FLAGS.flags[0].name).toBe("AlwaysAdd");
    });
    
    it("TRIGGER_FLAGS should have expected flags", () => {
      expect(TRIGGER_FLAGS.type).toBe("BitFlags");
      expect(TRIGGER_FLAGS.flags.length).toBe(3);
      expect(TRIGGER_FLAGS.flags[0].name).toBe("OneShot");
    });
  });
  
  describe("Pre-defined ID Parameters", () => {
    it("SPLINE_ID should reference splines", () => {
      expect(SPLINE_ID.type).toBe("Id");
      expect(SPLINE_ID.referencesType).toBe("spline");
    });
  });
  
  describe("calculateRotation", () => {
    it("should calculate 0 radians for value 0", () => {
      const result = calculateRotation(0, ROTATION_4_WAY);
      expect(result).toBe(0);
    });
    
    it("should calculate PI/2 for value 1 with 4-way rotation", () => {
      const result = calculateRotation(1, ROTATION_4_WAY);
      expect(result).toBeCloseTo(Math.PI / 2, 5);
    });
    
    it("should calculate PI for value 2 with 4-way rotation", () => {
      const result = calculateRotation(2, ROTATION_4_WAY);
      expect(result).toBeCloseTo(Math.PI, 5);
    });
    
    it("should calculate full rotation for divisions value", () => {
      const result = calculateRotation(4, ROTATION_4_WAY);
      expect(result).toBeCloseTo(Math.PI * 2, 5);
    });
    
    it("should apply offset when specified", () => {
      const rotWithOffset = { ...ROTATION_4_WAY, offset: Math.PI / 4 };
      const result = calculateRotation(0, rotWithOffset);
      expect(result).toBeCloseTo(Math.PI / 4, 5);
    });
  });
  
  describe("calculateScale", () => {
    it("should return defaultValue for 0", () => {
      const result = calculateScale(0, SCALE_ADDITIVE);
      expect(result).toBe(1);
    });
    
    it("should apply scaleFactor", () => {
      const result = calculateScale(10, SCALE_ADDITIVE);
      expect(result).toBe(1); // 10 * 0.1 = 1
    });
    
    it("should work with direct scale", () => {
      const result = calculateScale(2, SCALE_DIRECT);
      expect(result).toBe(2);
    });
  });
  
  describe("getSelectedTypeName", () => {
    const testSelector: TypeSelectorParam = {
      type: "TypeSelector",
      description: "Test selector",
      options: {
        0: "Option A",
        1: "Option B",
        2: "Option C",
      },
    };
    
    it("should return correct option name", () => {
      expect(getSelectedTypeName(0, testSelector)).toBe("Option A");
      expect(getSelectedTypeName(1, testSelector)).toBe("Option B");
      expect(getSelectedTypeName(2, testSelector)).toBe("Option C");
    });
    
    it("should return unknown for invalid value", () => {
      expect(getSelectedTypeName(99, testSelector)).toBe("Unknown (99)");
    });
  });
  
  describe("isFlagSet", () => {
    it("should detect set flags", () => {
      expect(isFlagSet(0b0001, 0)).toBe(true);
      expect(isFlagSet(0b0010, 1)).toBe(true);
      expect(isFlagSet(0b0100, 2)).toBe(true);
    });
    
    it("should detect unset flags", () => {
      expect(isFlagSet(0b0001, 1)).toBe(false);
      expect(isFlagSet(0b0010, 0)).toBe(false);
    });
    
    it("should handle multiple flags", () => {
      const value = 0b0101; // flags 0 and 2 set
      expect(isFlagSet(value, 0)).toBe(true);
      expect(isFlagSet(value, 1)).toBe(false);
      expect(isFlagSet(value, 2)).toBe(true);
    });
  });
  
  describe("getSetFlags", () => {
    it("should return empty array for 0", () => {
      const result = getSetFlags(0, ENEMY_SPAWN_FLAGS);
      expect(result).toEqual([]);
    });
    
    it("should return single flag", () => {
      const result = getSetFlags(1, ENEMY_SPAWN_FLAGS);
      expect(result).toEqual(["AlwaysAdd"]);
    });
    
    it("should return multiple flags", () => {
      const result = getSetFlags(0b011, ENEMY_SPAWN_FLAGS);
      expect(result).toContain("AlwaysAdd");
      expect(result).toContain("Regenerate");
      expect(result.length).toBe(2);
    });
    
    it("should return all flags when all set", () => {
      const result = getSetFlags(0b111, ENEMY_SPAWN_FLAGS);
      expect(result.length).toBe(3);
    });
  });
  
  describe("timerToSeconds", () => {
    it("should return value directly for seconds unit", () => {
      const timer: TimerParam = {
        type: "Timer",
        unit: "seconds",
        description: "Duration in seconds",
      };
      expect(timerToSeconds(5, timer)).toBe(5);
    });
    
    it("should convert ticks to seconds", () => {
      const timer: TimerParam = {
        type: "Timer",
        unit: "ticks",
        ticksPerSecond: 60,
        description: "Duration in ticks",
      };
      expect(timerToSeconds(60, timer)).toBe(1);
      expect(timerToSeconds(30, timer)).toBe(0.5);
    });
    
    it("should convert frames to seconds", () => {
      const timer: TimerParam = {
        type: "Timer",
        unit: "frames",
        ticksPerSecond: 30,
        description: "Duration in frames",
      };
      expect(timerToSeconds(30, timer)).toBe(1);
    });
    
    it("should use default 60fps when ticksPerSecond not specified", () => {
      const timer: TimerParam = {
        type: "Timer",
        unit: "ticks",
        description: "Duration in ticks",
      };
      expect(timerToSeconds(60, timer)).toBe(1);
    });
  });
  
  describe("Type guards", () => {
    it("isRotationParam should identify rotation params", () => {
      expect(isRotationParam(ROTATION_4_WAY)).toBe(true);
      expect(isRotationParam(SCALE_DIRECT)).toBe(false);
    });
    
    it("isScaleParam should identify scale params", () => {
      expect(isScaleParam(SCALE_DIRECT)).toBe(true);
      expect(isScaleParam(ROTATION_4_WAY)).toBe(false);
    });
    
    it("isTypeSelectorParam should identify type selector params", () => {
      const selector: TypeSelectorParam = {
        type: "TypeSelector",
        description: "Test",
        options: { 0: "A" },
      };
      expect(isTypeSelectorParam(selector)).toBe(true);
      expect(isTypeSelectorParam(ROTATION_4_WAY)).toBe(false);
    });
    
    it("isBitFlagsParam should identify bit flags params", () => {
      expect(isBitFlagsParam(ENEMY_SPAWN_FLAGS)).toBe(true);
      expect(isBitFlagsParam(ROTATION_4_WAY)).toBe(false);
    });
    
    it("isIdParam should identify ID params", () => {
      expect(isIdParam(SPLINE_ID)).toBe(true);
      expect(isIdParam(ROTATION_4_WAY)).toBe(false);
    });
    
    it("isCountParam should identify count params", () => {
      const count: CountParam = {
        type: "Count",
        description: "Number of items",
      };
      expect(isCountParam(count)).toBe(true);
      expect(isCountParam(ROTATION_4_WAY)).toBe(false);
    });
    
    it("isTimerParam should identify timer params", () => {
      const timer: TimerParam = {
        type: "Timer",
        unit: "seconds",
        description: "Duration",
      };
      expect(isTimerParam(timer)).toBe(true);
      expect(isTimerParam(ROTATION_4_WAY)).toBe(false);
    });
    
    it("isSpeedParam should identify speed params", () => {
      const speed: SpeedParam = {
        type: "Speed",
        unit: "units_per_second",
        description: "Movement speed",
      };
      expect(isSpeedParam(speed)).toBe(true);
      expect(isSpeedParam(ROTATION_4_WAY)).toBe(false);
    });
    
    it("isCoordinateParam should identify coordinate params", () => {
      const coord: CoordinateParam = {
        type: "Coordinate",
        axis: "x",
        description: "X offset",
      };
      expect(isCoordinateParam(coord)).toBe(true);
      expect(isCoordinateParam(ROTATION_4_WAY)).toBe(false);
    });
  });
});
