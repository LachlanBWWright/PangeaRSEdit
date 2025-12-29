/**
 * Fix null and undefined values in parsed rsrcdump-ts output
 * 
 * rsrcdump-ts v1.0.4 has a bug where it returns null/undefined for numeric zero values
 * This function recursively converts null/undefined to 0 for all numeric fields
 * 
 * This is a workaround until the package is fixed
 */

/**
 * Recursively fix null and undefined values in an object, converting them to 0
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
