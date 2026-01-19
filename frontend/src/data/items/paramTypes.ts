/**
 * Common parameter types used across multiple games.
 * These provide standardized descriptions for frequently-used parameter patterns.
 */

import type { ParamDescription, FlagDescription } from "./itemParams";

// ============================================================================
// Rotation Parameter Types
// ============================================================================

/**
 * Rotation parameter with 8 directions (0-7, each unit = 45°)
 * Common formula: (float)itemPtr->parm[N] * (PI2/8.0f)
 */
export function createRotation8(
  paramIndex: number,
  fileName: string,
  lineNumber: number,
): ParamDescription {
  return {
    type: "Integer",
    description: "Rotation (0-7, where each unit = 45°, total 360°)",
    codeSample: {
      code: `(float)itemPtr->parm[${paramIndex}] * (PI2/8.0f)`,
      fileName,
      lineNumber,
    },
  };
}

/**
 * Rotation parameter with 4 directions (0-3, each unit = 90°)
 * Common formula: (float)itemPtr->parm[N] * (PI/2)
 */
export function createRotation4(
  paramIndex: number,
  fileName: string,
  lineNumber: number,
): ParamDescription {
  return {
    type: "Integer",
    description: "Rotation (0-3, where each unit = 90°)",
    codeSample: {
      code: `(float)itemPtr->parm[${paramIndex}] * (PI/2)`,
      fileName,
      lineNumber,
    },
  };
}

/**
 * Rotation parameter with 2 directions (0=0°, 1=180°)
 * Common formula: (float)itemPtr->parm[N] * PI
 */
export function createRotation2(
  paramIndex: number,
  fileName: string,
  lineNumber: number,
): ParamDescription {
  return {
    type: "Integer",
    description: "Rotation (0=0°, 1=180°)",
    codeSample: {
      code: `(float)itemPtr->parm[${paramIndex}] * PI`,
      fileName,
      lineNumber,
    },
  };
}

// ============================================================================
// Type Selector Parameters
// ============================================================================

/**
 * Create a type selector parameter (e.g., enemy type, plant type)
 */
export function createTypeSelector(
  description: string,
  variants: string[],
  fileName: string,
  lineNumber: number,
  paramIndex: number = 0,
): ParamDescription {
  const variantStr = variants.map((v, i) => `${i}=${v}`).join(", ");
  return {
    type: "Integer",
    description: `${description} (${variantStr})`,
    codeSample: {
      code: `int type = itemPtr->parm[${paramIndex}];`,
      fileName,
      lineNumber,
    },
  };
}

// ============================================================================
// Common Enemy Flags
// ============================================================================

/**
 * Create common enemy flags for p3
 * Typically: bit 0 = always add, bit 1 = enemy regenerate
 */
export function createEnemyFlags(
  fileName: string,
  alwaysAddLine: number,
  regenerateLine: number,
): ParamDescription {
  return {
    type: "Bit Flags",
    flags: [
      {
        index: 0,
        description: "Always add (ignore max enemy limit)",
        codeSample: {
          code: "if (!(itemPtr->parm[3] & 1))",
          fileName,
          lineNumber: alwaysAddLine,
        },
      },
      {
        index: 1,
        description: "Enemy regenerate after death",
        codeSample: {
          code: "newObj->EnemyRegenerate = itemPtr->parm[3] & (1<<1);",
          fileName,
          lineNumber: regenerateLine,
        },
      },
    ],
  };
}

// ============================================================================
// Common Powerup Flags
// ============================================================================

/**
 * Create common powerup flags
 * Typically: bit 0 = auto-regenerate, bit 1 = terrain only
 */
export function createPowerupFlags(
  fileName: string,
  regenerateLine: number,
  terrainOnlyLine: number,
): ParamDescription {
  return {
    type: "Bit Flags",
    flags: [
      {
        index: 0,
        description: "Auto-regenerate after collection",
        codeSample: {
          code: "newObj->POWRegenerate = itemPtr->parm[3] & 1;",
          fileName,
          lineNumber: regenerateLine,
        },
      },
      {
        index: 1,
        description: "Place on terrain only (not in air)",
        codeSample: {
          code: "if (itemPtr->parm[3] & (1<<1))",
          fileName,
          lineNumber: terrainOnlyLine,
        },
      },
    ],
  };
}

// ============================================================================
// Scale Parameters
// ============================================================================

/**
 * Create a scale multiplier parameter
 */
export function createScaleMultiplier(
  fileName: string,
  lineNumber: number,
  paramIndex: number = 0,
): ParamDescription {
  return {
    type: "Integer",
    description: "Scale multiplier (0=default, higher=larger)",
    codeSample: {
      code: `float scale = 1.0f + (float)itemPtr->parm[${paramIndex}] * 0.1f;`,
      fileName,
      lineNumber,
    },
  };
}

// ============================================================================
// ID Parameters
// ============================================================================

/**
 * Create an ID parameter (for teleporters, ziplines, etc.)
 */
export function createIdParameter(
  description: string,
  maxValue: number,
  fileName: string,
  lineNumber: number,
  paramIndex: number = 0,
): ParamDescription {
  return {
    type: "Integer",
    description: `${description} (0-${maxValue})`,
    codeSample: {
      code: `int id = itemPtr->parm[${paramIndex}];`,
      fileName,
      lineNumber,
    },
  };
}

// ============================================================================
// Predefined Common Types
// ============================================================================

/** Standard "Unused" parameter */
export const UNUSED: ParamDescription = "Unused";

/** Standard "Unknown" parameter */
export const UNKNOWN: ParamDescription = "Unknown";

/**
 * Create a standard flags description for auto-fade status bits
 */
export const AUTO_FADE_FLAGS = "Auto-fade status bits";
