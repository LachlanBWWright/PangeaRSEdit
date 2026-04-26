/**
 * Fix null and undefined values in parsed rsrcdump-ts output
 *
 * HISTORY:
 * - rsrcdump-ts v1.0.4 and v1.0.5 had a bug where they returned null/undefined for numeric zero values
 * - rsrcdump-ts v1.0.6 fixed these bugs
 *
 * This function is kept as a safety net for:
 * 1. Backwards compatibility with older rsrcdump-ts versions
 * 2. Edge cases in preprocessing that may create undefined values
 * 3. Defensive programming to ensure data quality
 *
 * It recursively converts null/undefined to 0 for all numeric fields
 * and converts undefined obj arrays in resource entries to empty arrays
 */

import { plainObjectSchema } from "@/schemas/common";

const NUMERIC_FIELD_PATTERNS = [
  /^(x|y|z|w)$/i,
  /^(width|height|depth)$/i,
  /^(min|max)$/i,
  /^(left|right|top|bottom)$/i,
  /^(row|col|column)$/i,
  /^(index|count|total|num)$/i,
  /^(offset|position|size|scale)$/i,
  /^(red|green|blue|alpha|r|g|b|a)$/i,
  /^x_\d+$/,
  /^y_\d+$/,
  /coordinate/i,
  /angle/i,
  /rotation/i,
  /velocity/i,
  /speed/i,
  /^flags?$/i,
  /^type$/i,
];

function fixNullField(target: object, key: string): void {
  if (key === "obj") {
    Reflect.set(target, key, []);
    return;
  }
  if (NUMERIC_FIELD_PATTERNS.some((p) => p.test(key))) {
    Reflect.set(target, key, 0);
  }
}

/**
 * Recursively fix null and undefined values in an object, converting them to 0 or []
 *
 * @param obj - The object to fix (will be mutated in place)
 * @returns The fixed object (same reference)
 */
export function fixNullToZero(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      if (item === null || item === undefined) {
        obj[i] = 0;
        return;
      }
      if (plainObjectSchema.safeParse(item).success || Array.isArray(item))
        fixNullToZero(item);
    });
    return obj;
  }

  const parseResult = plainObjectSchema.safeParse(obj);
  if (parseResult.success) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        fixNullField(obj, key);
        continue;
      }
      if (plainObjectSchema.safeParse(value).success || Array.isArray(value))
        fixNullToZero(value);
    }
    return obj;
  }

  return obj;
}
