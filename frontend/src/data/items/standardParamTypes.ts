/**
 * Standard Parameter Types
 * 
 * Defines commonly repeated parameter patterns used across multiple games.
 * These provide a standardized way to describe rotation, scale, type selection,
 * and other common item parameter behaviors.
 */

import type { CodeSample } from "./itemParams";

/**
 * Base interface for all standard parameter types
 */
interface BaseStandardParam {
  description: string;
  codeSample?: CodeSample;
}

/**
 * Rotation parameter - represents angular rotation
 * Value is multiplied by the rotation divisor to get radians
 */
export interface RotationParam extends BaseStandardParam {
  type: "Rotation";
  /** Number of rotation steps (e.g., 4 for 90° steps, 8 for 45° steps) */
  divisions: number;
  /** Human-readable multiplier string (e.g., "PI/2", "PI2/8") */
  multiplier: string;
  /** Starting angle offset in radians (default 0) */
  offset?: number;
}

/**
 * Scale parameter - represents size scaling factor
 */
export interface ScaleParam extends BaseStandardParam {
  type: "Scale";
  /** Minimum value */
  minValue: number;
  /** Maximum value */
  maxValue: number;
  /** Default value when parameter is 0 */
  defaultValue: number;
  /** Multiplier to convert param value to scale (default 1) */
  scaleFactor?: number;
}

/**
 * Model variant mapping for param-dependent model selection
 */
export interface ModelVariant {
  /** BG3D filename */
  modelFile: string;
  /** Path type */
  modelPath: "models" | "skeletons";
  /** Model index within the BG3D file */
  modelIndex: number;
  /** Number of consecutive subgroups to include (default: 1) */
  groupSize?: number;
  /** True if model requires skeleton data */
  requiresSkeleton?: boolean;
  /** Skeleton .rsrc filename */
  skeletonFile?: string;
  /** Scale multiplier */
  scale?: number;
  /** Horizontal (XZ) scale factor applied on top of uniform scale */
  scaleXZ?: number;
  /** Vertical (Y) scale factor applied on top of uniform scale */
  scaleY?: number;
  /** Y-axis rotation offset in radians */
  rotationY?: number;
  /** Position offset [x, y, z] relative to the item's terrain position */
  positionOffset?: [number, number, number];
  /** References to game source code that define this mapping */
  citations?: readonly import("./itemModelTypes").SourceCitation[];
}

/**
 * Type selector parameter - chooses between discrete options
 * Can optionally include model variants for param-dependent model selection
 */
export interface TypeSelectorParam extends BaseStandardParam {
  type: "TypeSelector";
  /** Mapping of param values to type names */
  options: Record<number, string>;
  /** Optional mapping of param values to model variants (for param-dependent models) */
  modelVariants?: Record<number, ModelVariant>;
}

/**
 * Bit flags parameter - each bit represents a boolean flag
 */
export interface BitFlagsParam extends BaseStandardParam {
  type: "BitFlags";
  /** Array of flag definitions */
  flags: {
    /** Bit index (0-31) */
    index: number;
    /** Flag name */
    name: string;
    /** Flag description */
    description: string;
    /** Code sample for this flag */
    codeSample?: CodeSample;
  }[];
}

/**
 * ID parameter - represents an identifier or reference
 */
export interface IdParam extends BaseStandardParam {
  type: "Id";
  /** Maximum valid value (optional) */
  maxValue?: number;
  /** What this ID references */
  referencesType?: "spline" | "item" | "trigger" | "path" | "fence" | "other";
}

/**
 * Count parameter - represents a quantity
 */
export interface CountParam extends BaseStandardParam {
  type: "Count";
  /** Minimum count (default 0) */
  minValue?: number;
  /** Maximum count (optional) */
  maxValue?: number;
  /** Unit label (e.g., "enemies", "seconds", "tiles") */
  unit?: string;
}

/**
 * Timer/Duration parameter - represents time in game ticks or seconds
 */
export interface TimerParam extends BaseStandardParam {
  type: "Timer";
  /** Time unit */
  unit: "ticks" | "seconds" | "frames";
  /** Ticks per second if unit is ticks (e.g., 60 for 60fps) */
  ticksPerSecond?: number;
  /** Minimum duration */
  minValue?: number;
  /** Maximum duration */
  maxValue?: number;
}

/**
 * Speed/Velocity parameter - represents movement speed
 */
export interface SpeedParam extends BaseStandardParam {
  type: "Speed";
  /** Speed unit */
  unit: "units_per_tick" | "units_per_second";
  /** Multiplier to convert to base unit */
  multiplier?: number;
}

/**
 * Coordinate parameter - represents a position offset or coordinate
 */
export interface CoordinateParam extends BaseStandardParam {
  type: "Coordinate";
  /** Axis this coordinate represents */
  axis: "x" | "y" | "z" | "all";
  /** Whether this is relative to item position */
  relative?: boolean;
}

/**
 * Union of all standard parameter types
 */
export type StandardParamType =
  | RotationParam
  | ScaleParam
  | TypeSelectorParam
  | BitFlagsParam
  | IdParam
  | CountParam
  | TimerParam
  | SpeedParam
  | CoordinateParam;

// ============================================================================
// Pre-defined Standard Rotation Parameters
// ============================================================================

/**
 * 4-way rotation (0, 90, 180, 270 degrees)
 * p0 * PI/2 radians
 */
export const ROTATION_4_WAY: RotationParam = {
  type: "Rotation",
  divisions: 4,
  multiplier: "PI/2",
  description: "Rotation in 90° increments (0-3 = 0°, 90°, 180°, 270°)",
};

/**
 * 2-way rotation (0° or 90°)
 * p * PI/2 radians, only values 0 and 1 are meaningful
 */
export const ROTATION_2_WAY: RotationParam = {
  type: "Rotation",
  divisions: 4,
  multiplier: "PI/2",
  description: "Rotation 0° or 90° (0 = 0°, 1 = 90°)",
};

/**
 * 8-way rotation (45 degree steps)
 * p0 * PI/4 radians
 */
export const ROTATION_8_WAY: RotationParam = {
  type: "Rotation",
  divisions: 8,
  multiplier: "PI/4",
  description: "Rotation in 45° increments (0-7)",
};

/**
 * 16-way rotation (22.5 degree steps)
 * p0 * PI2/16 radians
 */
export const ROTATION_16_WAY: RotationParam = {
  type: "Rotation",
  divisions: 16,
  multiplier: "PI2/16",
  description: "Rotation in 22.5° increments (0-15)",
};

/**
 * Continuous rotation (0-65535 maps to 0-2π)
 */
export const ROTATION_CONTINUOUS: RotationParam = {
  type: "Rotation",
  divisions: 65536,
  multiplier: "PI2/65536",
  description: "Continuous rotation (0-65535 = 0° to 360°)",
};

// ============================================================================
// Pre-defined Standard Scale Parameters
// ============================================================================

/**
 * Scale where 0 = default size, higher = larger
 */
export const SCALE_ADDITIVE: ScaleParam = {
  type: "Scale",
  minValue: 0,
  maxValue: 100,
  defaultValue: 1,
  scaleFactor: 0.1,
  description: "Scale factor (0 = normal, higher = larger)",
};

/**
 * Scale as direct multiplier (1.0 = normal)
 */
export const SCALE_DIRECT: ScaleParam = {
  type: "Scale",
  minValue: 0,
  maxValue: 100,
  defaultValue: 1,
  scaleFactor: 1,
  description: "Scale multiplier (1 = normal size)",
};

// ============================================================================
// Pre-defined Standard Flag Parameters
// ============================================================================

/**
 * Common enemy spawn flags
 */
export const ENEMY_SPAWN_FLAGS: BitFlagsParam = {
  type: "BitFlags",
  description: "Enemy spawning behavior flags",
  flags: [
    { index: 0, name: "AlwaysAdd", description: "Always add (ignore max enemy limit)" },
    { index: 1, name: "Regenerate", description: "Enemy regenerates after death" },
    { index: 2, name: "Aggressive", description: "Enemy starts in aggressive state" },
  ],
};

/**
 * Common trigger flags
 */
export const TRIGGER_FLAGS: BitFlagsParam = {
  type: "BitFlags",
  description: "Trigger behavior flags",
  flags: [
    { index: 0, name: "OneShot", description: "Trigger only activates once" },
    { index: 1, name: "PlayerOnly", description: "Only player can activate" },
    { index: 2, name: "Invisible", description: "Trigger is not visible" },
  ],
};

// ============================================================================
// Pre-defined Type Selectors with Model Variants
// ============================================================================

/**
 * Otto Matic Human type selector with model variants
 * p1 parameter determines which human model to use
 */
export const OTTO_HUMAN_TYPE: TypeSelectorParam = {
  type: "TypeSelector",
  description: "Human character type (determines 3D model)",
  options: {
    0: "Farmer",
    1: "Bee Woman",
    2: "Scientist",
    3: "Skirt Lady",
  },
  modelVariants: {
    0: {
      modelFile: "Farmer.bg3d",
      modelPath: "skeletons",
      modelIndex: 0,
      requiresSkeleton: true,
      skeletonFile: "Farmer.skeleton.rsrc",
    },
    1: {
      modelFile: "BeeWoman.bg3d",
      modelPath: "skeletons",
      modelIndex: 0,
      requiresSkeleton: true,
      skeletonFile: "BeeWoman.skeleton.rsrc",
    },
    2: {
      modelFile: "Scientist.bg3d",
      modelPath: "skeletons",
      modelIndex: 0,
      requiresSkeleton: true,
      skeletonFile: "Scientist.skeleton.rsrc",
    },
    3: {
      modelFile: "SkirtLady.bg3d",
      modelPath: "skeletons",
      modelIndex: 0,
      requiresSkeleton: true,
      skeletonFile: "SkirtLady.skeleton.rsrc",
    },
  },
};

// ============================================================================
// Pre-defined Standard ID Parameters
// ============================================================================

/**
 * Spline ID reference
 */
export const SPLINE_ID: IdParam = {
  type: "Id",
  description: "Spline ID to follow or reference",
  referencesType: "spline",
};

/**
 * Item ID reference
 */
export const ITEM_ID: IdParam = {
  type: "Id",
  description: "Item ID to interact with",
  referencesType: "item",
};

/**
 * Trigger ID reference
 */
export const TRIGGER_ID: IdParam = {
  type: "Id",
  description: "Trigger ID to activate",
  referencesType: "trigger",
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate rotation in radians from a parameter value
 */
export function calculateRotation(paramValue: number, rotationParam: RotationParam): number {
  const radians = (paramValue / rotationParam.divisions) * Math.PI * 2;
  return radians + (rotationParam.offset ?? 0);
}

/**
 * Calculate scale factor from a parameter value
 */
export function calculateScale(paramValue: number, scaleParam: ScaleParam): number {
  if (paramValue === 0) {
    return scaleParam.defaultValue;
  }
  return paramValue * (scaleParam.scaleFactor ?? 1);
}

/**
 * Get the selected option name from a type selector
 */
export function getSelectedTypeName(paramValue: number, typeSelector: TypeSelectorParam): string {
  return typeSelector.options[paramValue] ?? `Unknown (${paramValue})`;
}

/**
 * Check if a flag is set in a bit flags parameter
 */
export function isFlagSet(paramValue: number, flagIndex: number): boolean {
  return (paramValue & (1 << flagIndex)) !== 0;
}

/**
 * Get all set flags from a bit flags parameter
 */
export function getSetFlags(paramValue: number, flagsParam: BitFlagsParam): string[] {
  return flagsParam.flags
    .filter(flag => isFlagSet(paramValue, flag.index))
    .map(flag => flag.name);
}

/**
 * Convert time parameter to seconds
 */
export function timerToSeconds(paramValue: number, timerParam: TimerParam): number {
  switch (timerParam.unit) {
    case "seconds":
      return paramValue;
    case "frames":
    case "ticks":
      return paramValue / (timerParam.ticksPerSecond ?? 60);
    default:
      return paramValue;
  }
}

/**
 * Check if a standard param type is of a specific kind
 */
export function isRotationParam(param: StandardParamType): param is RotationParam {
  return param.type === "Rotation";
}

export function isScaleParam(param: StandardParamType): param is ScaleParam {
  return param.type === "Scale";
}

export function isTypeSelectorParam(param: StandardParamType): param is TypeSelectorParam {
  return param.type === "TypeSelector";
}

export function isBitFlagsParam(param: StandardParamType): param is BitFlagsParam {
  return param.type === "BitFlags";
}

export function isIdParam(param: StandardParamType): param is IdParam {
  return param.type === "Id";
}

export function isCountParam(param: StandardParamType): param is CountParam {
  return param.type === "Count";
}

export function isTimerParam(param: StandardParamType): param is TimerParam {
  return param.type === "Timer";
}

export function isSpeedParam(param: StandardParamType): param is SpeedParam {
  return param.type === "Speed";
}

export function isCoordinateParam(param: StandardParamType): param is CoordinateParam {
  return param.type === "Coordinate";
}

/**
 * Get model variant from a type selector param for a given param value
 */
export function getModelVariant(
  paramValue: number, 
  typeSelector: TypeSelectorParam
): ModelVariant | undefined {
  return typeSelector.modelVariants?.[paramValue];
}

/**
 * Check if a type selector param has model variants
 */
export function hasModelVariants(typeSelector: TypeSelectorParam): boolean {
  return typeSelector.modelVariants !== undefined && 
         Object.keys(typeSelector.modelVariants).length > 0;
}

/**
 * Get a parameter value from params by index (0-3)
 */
export function getParamByIndex(
  params: { p0: number; p1: number; p2: number; p3: number },
  index: 0 | 1 | 2 | 3
): number {
  switch (index) {
    case 0: return params.p0;
    case 1: return params.p1;
    case 2: return params.p2;
    case 3: return params.p3;
  }
}
