import type { ItemParams, ParamDescription, CodeSample } from "../itemParams";
import type { ExtractedCitation } from "./types";

/**
 * Extract all code citations from item parameters for a game
 */
export function extractCitationsFromParams(
  itemParams: Record<number, ItemParams>,
  itemNames: Record<number, string>,
): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];

  for (const [itemTypeStr, params] of Object.entries(itemParams)) {
    const itemType = Number(itemTypeStr);
    const itemName = itemNames[itemType] ?? `Item ${itemType}`;

    // Extract from each parameter (p0-p3)
    for (const paramName of ["p0", "p1", "p2", "p3"] as const) {
      const param = params[paramName];
      if (param && typeof param === "object") {
        // Handle Integer type with codeSample
        if ("type" in param && param.type === "Integer" && "codeSample" in param) {
          citations.push({
            itemType,
            itemName,
            paramName,
            citation: param.codeSample,
          });
        }

        // Handle Bit Flags type with multiple citations
        if ("type" in param && param.type === "Bit Flags" && "flags" in param) {
          for (const flag of param.flags) {
            if (flag.codeSample) {
              citations.push({
                itemType,
                itemName,
                paramName,
                flagIndex: flag.index,
                citation: flag.codeSample,
              });
            }
          }
        }
      }
    }
  }

  return citations;
}

/**
 * Get all citations from a ParamDescription
 */
export function getCitationsFromParam(
  param: ParamDescription,
): CodeSample[] {
  if (param === "Unused" || param === "Unknown") {
    return [];
  }

  if (param.type === "Integer") {
    return [param.codeSample];
  }

  if (param.type === "Bit Flags") {
    return param.flags.map((f) => f.codeSample);
  }

  return [];
}
