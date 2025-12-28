/**
 * Types for map roundtrip operations
 * These are used for parsing and serializing terrain/level data
 */

import { LevelData } from "@/python/structSpecs/LevelTypes";

/**
 * Result of parsing a level data file
 */
export interface ParseLevelResult {
  levelData: LevelData;
  rawBuffer: ArrayBuffer;
}

/**
 * Result of serializing level data back to binary
 */
export interface SerializeLevelResult {
  buffer: ArrayBuffer;
  originalSize: number;
}

/**
 * Options for parsing level data
 */
export interface ParseLevelOptions {
  structSpecs: string[];
  includeTypes?: string[];
  excludeTypes?: string[];
}

/**
 * Options for serializing level data
 */
export interface SerializeLevelOptions {
  structSpecs: string[];
  onlyTypes?: string[];
  skipTypes?: string[];
  adf?: boolean;
}

/**
 * Comparison result for roundtrip testing
 */
export interface RoundtripComparisonResult {
  success: boolean;
  originalSize: number;
  roundtripSize: number;
  bytesMatch: boolean;
  jsonMatch: boolean;
  differences: RoundtripDifference[];
}

/**
 * Individual difference found during roundtrip comparison
 */
export interface RoundtripDifference {
  field: string;
  original: unknown;
  roundtrip: unknown;
  type: "missing" | "extra" | "value_mismatch" | "type_mismatch";
}
