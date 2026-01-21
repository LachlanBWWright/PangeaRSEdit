/**
 * Standard parameter type definitions for commonly repeated patterns
 */

export interface RotationParam {
  type: "Rotation";
  divisions: number;  // e.g., 4 for PI/2, 8 for PI2/8
  multiplier: string; // "PI/2", "PI2/4", etc.
}

export interface ScaleParam {
  type: "Scale";
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

export interface TypeSelectorParam {
  type: "TypeSelector";
  options: Record<number, string>;
}

export interface BitFlagsParam {
  type: "BitFlags";
  flags: {
    index: number;
    name: string;
    description: string;
  }[];
}

export interface IdParam {
  type: "Id";
  description: string;
  maxValue?: number;
}

export interface CountParam {
  type: "Count";
  description: string;
  minValue?: number;
  maxValue?: number;
}

export type StandardParamType =
  | RotationParam
  | ScaleParam
  | TypeSelectorParam
  | BitFlagsParam
  | IdParam
  | CountParam;

/**
 * Pre-defined standard rotation parameters
 */
export const ROTATION_4_WAY: RotationParam = {
  type: "Rotation",
  divisions: 4,
  multiplier: "PI/2",
};

export const ROTATION_8_WAY: RotationParam = {
  type: "Rotation",
  divisions: 8,
  multiplier: "PI2/8",
};

export const ROTATION_16_WAY: RotationParam = {
  type: "Rotation",
  divisions: 16,
  multiplier: "PI2/16",
};

/**
 * Common enemy flags pattern
 */
export const ENEMY_SPAWN_FLAGS: BitFlagsParam = {
  type: "BitFlags",
  flags: [
    { index: 0, name: "AlwaysAdd", description: "Always add (ignore max limit)" },
    { index: 1, name: "Regenerate", description: "Enemy regenerates after death" },
  ],
};
