/**
 * Fix null and undefined values in parsed rsrcdump-ts output
 * 
 * rsrcdump-ts v1.0.5 STILL has a bug where it returns null/undefined for numeric zero values
 * AND it returns undefined for empty arrays in resource entries
 * This function recursively converts null/undefined to 0 for all numeric fields
 * and converts undefined obj arrays in resource entries to empty arrays
 * 
 * This is a workaround until the package is fixed
 */

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
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (item === null || item === undefined) {
        // Convert all nulls/undefined in arrays to 0 (rsrcdump-ts bug workaround)
        obj[i] = 0;
      } else if (typeof item === 'object') {
        fixNullToZero(item);
      }
    }
    return obj;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        // Special case: resource entry 'obj' field should be an empty array if undefined
        if (key === 'obj') {
          (obj as Record<string, unknown>)[key] = [];
          continue;
        }

        // Common numeric field names that should be 0 instead of null/undefined
        const numericFieldPatterns = [
          /^(x|y|z|w)$/i,
          /^(width|height|depth)$/i,
          /^(min|max)$/i,
          /^(left|right|top|bottom)$/i,
          /^(row|col|column)$/i,
          /^(index|count|total|num)$/i,
          /^(offset|position|size|scale)$/i,
          /^(red|green|blue|alpha|r|g|b|a)$/i,
          /^x_\d+$/,  // x_0, x_1, etc (liquid nubs)
          /^y_\d+$/,  // y_0, y_1, etc (liquid nubs)
          /coordinate/i,
          /angle/i,
          /rotation/i,
          /velocity/i,
          /speed/i,
          /^flags?$/i,
          /^type$/i,
        ];

        const isLikelyNumeric = numericFieldPatterns.some(pattern => 
          pattern.test(key)
        );

        if (isLikelyNumeric) {
          (obj as Record<string, unknown>)[key] = 0;
        }
      } else if (typeof value === 'object') {
        fixNullToZero(value);
      }
    }
    return obj;
  }

  return obj;
}
