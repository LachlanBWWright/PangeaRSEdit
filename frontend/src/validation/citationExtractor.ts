/**
 * Citation Extractor
 * 
 * Extracts code citations from item parameter definitions for verification.
 */

import { TerrainItemTypeParams } from "../data/items/ottoItemType";
import { bugdom2ItemTypeParams } from "../data/items/bugdom2ItemType";
import { bugdomItemTypeParams } from "../data/items/bugdomItemType";
import { billyFrontierItemTypeParams } from "../data/items/billyFrontierItemType";
import { nanosaurItemTypeParams } from "../data/items/nanosaurItemType";
import { nanosaur2ItemTypeParams } from "../data/items/nanosaur2ItemType";
import { croMagItemTypeParams } from "../data/items/croMagItemType";
import type { ParamDescription } from "../data/items/itemParams";

export interface CodeSample {
  code: string;
  fileName: string;
  lineNumber: number;
}

export interface Citation {
  game: string;              // "ottomatic", "bugdom2", etc.
  itemType: string;          // Item type name
  itemTypeNumber: number;    // Item type number
  parameterName: string;     // "p0", "p1", "p2", "p3", or "flags"
  codeSample: CodeSample;
  sourceFile: string;        // Full path in this codebase
}

/**
 * Map of game names to their item type param definitions
 */
const GAME_ITEM_PARAMS: Record<string, { params: Record<number, Record<string, ParamDescription | undefined>>; sourceFile: string }> = {
  ottomatic: {
    params: TerrainItemTypeParams as Record<number, Record<string, ParamDescription | undefined>>,
    sourceFile: "frontend/src/data/items/ottoItemType.ts",
  },
  bugdom2: {
    params: bugdom2ItemTypeParams as Record<number, Record<string, ParamDescription | undefined>>,
    sourceFile: "frontend/src/data/items/bugdom2ItemType.ts",
  },
  bugdom: {
    params: bugdomItemTypeParams as Record<number, Record<string, ParamDescription | undefined>>,
    sourceFile: "frontend/src/data/items/bugdomItemType.ts",
  },
  billyfrontier: {
    params: billyFrontierItemTypeParams as Record<number, Record<string, ParamDescription | undefined>>,
    sourceFile: "frontend/src/data/items/billyFrontierItemType.ts",
  },
  nanosaur: {
    params: nanosaurItemTypeParams as Record<number, Record<string, ParamDescription | undefined>>,
    sourceFile: "frontend/src/data/items/nanosaurItemType.ts",
  },
  nanosaur2: {
    params: nanosaur2ItemTypeParams as Record<number, Record<string, ParamDescription | undefined>>,
    sourceFile: "frontend/src/data/items/nanosaur2ItemType.ts",
  },
  cromag: {
    params: croMagItemTypeParams as Record<number, Record<string, ParamDescription | undefined>>,
    sourceFile: "frontend/src/data/items/croMagItemType.ts",
  },
};

/**
 * Extract code sample from a parameter description if it has one
 */
function extractCodeSample(param: ParamDescription): CodeSample | null {
  if (param === "Unused" || param === "Unknown") {
    return null;
  }
  if (param.type === "Integer" && param.codeSample) {
    return param.codeSample;
  }
  if (param.type === "Bit Flags") {
    // Bit flags may have code samples in each flag
    for (const flag of param.flags) {
      if (flag.codeSample) {
        return flag.codeSample;
      }
    }
  }
  return null;
}

/**
 * Extract all citations from a game's item type definitions
 */
export function extractCitations(game: string): Citation[] {
  const gameData = GAME_ITEM_PARAMS[game];
  if (!gameData) {
    return [];
  }

  const citations: Citation[] = [];
  const { params, sourceFile } = gameData;

  for (const [itemTypeKey, itemParams] of Object.entries(params)) {
    const itemTypeNumber = parseInt(itemTypeKey);
    if (isNaN(itemTypeNumber)) continue;

    const paramNames = ["p0", "p1", "p2", "p3", "flags"] as const;
    
    for (const paramName of paramNames) {
      const param = itemParams[paramName];
      if (!param) continue;

      const codeSample = extractCodeSample(param);
      if (codeSample) {
        citations.push({
          game,
          itemType: itemTypeKey,
          itemTypeNumber,
          parameterName: paramName,
          codeSample,
          sourceFile,
        });
      }
    }
  }

  return citations;
}

/**
 * Extract all citations across all games
 */
export function extractAllCitations(): Citation[] {
  const allCitations: Citation[] = [];
  
  for (const game of Object.keys(GAME_ITEM_PARAMS)) {
    const citations = extractCitations(game);
    allCitations.push(...citations);
  }
  
  return allCitations;
}

/**
 * Get games that have item type params defined
 */
export function getGamesWithItemParams(): string[] {
  return Object.keys(GAME_ITEM_PARAMS);
}

/**
 * Get citation count for a game
 */
export function getCitationCount(game: string): number {
  return extractCitations(game).length;
}

/**
 * Get all citation counts across all games
 */
export function getAllCitationCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const game of Object.keys(GAME_ITEM_PARAMS)) {
    counts[game] = getCitationCount(game);
  }
  return counts;
}
