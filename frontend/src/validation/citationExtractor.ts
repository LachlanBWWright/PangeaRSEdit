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
import { mightyMikeItemParams } from "../data/items/mightyMikeItemParams";
import type { Citation as ParamCitation, ParamDescription } from "../data/items/itemParams";

export type CodeSample = ParamCitation;

export interface Citation {
  game: string;
  itemType: string;
  itemTypeNumber: number;
  parameterName: string;
  citation: ParamCitation;
  sourceFile: string;
}

interface GameItemParamsEntry {
  params: unknown;
  sourceFile: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCitation(value: unknown): value is ParamCitation {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.url === "string" &&
    typeof value.fileName === "string" &&
    typeof value.lineNumber === "number" &&
    typeof value.code === "string"
  );
}

function isParamDescription(value: unknown): value is ParamDescription {
  if (value === "Unused" || value === "Unknown") {
    return true;
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "Integer" || value.type === "Rotation" || value.type === "TypeSelector") {
    return isCitation(value.defaultCitation);
  }

  return (
    value.type === "Bit Flags" &&
    Array.isArray(value.flags) &&
    value.flags.every(
      (flag) =>
        isRecord(flag) &&
        typeof flag.index === "number" &&
        typeof flag.description === "string" &&
        isCitation(flag.defaultCitation),
    )
  );
}

const GAME_ITEM_PARAMS: Record<string, GameItemParamsEntry> = {
  ottomatic: {
    params: TerrainItemTypeParams,
    sourceFile: "frontend/src/data/items/ottoItemType.ts",
  },
  bugdom2: {
    params: bugdom2ItemTypeParams,
    sourceFile: "frontend/src/data/items/bugdom2ItemType.ts",
  },
  bugdom: {
    params: bugdomItemTypeParams,
    sourceFile: "frontend/src/data/items/bugdomItemType.ts",
  },
  billyfrontier: {
    params: billyFrontierItemTypeParams,
    sourceFile: "frontend/src/data/items/billyFrontierItemType.ts",
  },
  nanosaur: {
    params: nanosaurItemTypeParams,
    sourceFile: "frontend/src/data/items/nanosaurItemType.ts",
  },
  nanosaur2: {
    params: nanosaur2ItemTypeParams,
    sourceFile: "frontend/src/data/items/nanosaur2ItemType.ts",
  },
  cromag: {
    params: croMagItemTypeParams,
    sourceFile: "frontend/src/data/items/croMagItemType.ts",
  },
  mightymike: {
    params: mightyMikeItemParams,
    sourceFile: "frontend/src/data/items/mightyMikeItemParams.ts",
  },
};

export interface MissingCitationEntry {
  game: string;
  itemType: number;
  parameterName: "p0" | "p1" | "p2" | "p3" | "flags";
  reason:
    | "missing_default_citation"
    | "missing_flag_citation"
    | "missing_citation_url"
    | "invalid_line_number";
}

function extractParamCitations(param: ParamDescription): ParamCitation[] {
  if (param === "Unused" || param === "Unknown") {
    return [];
  }

  if (param.type === "Integer" || param.type === "Rotation" || param.type === "TypeSelector") {
    return [
      param.defaultCitation,
      ...(param.additionalCitations ?? []),
    ];
  }

  return [
    param.defaultCitation,
    ...(param.additionalCitations ?? []),
    ...param.flags.flatMap((flag) => [
      flag.defaultCitation,
      ...(flag.additionalCitations ?? []),
    ]),
  ];
}

export function extractCitations(game: string): Citation[] {
  const gameData = GAME_ITEM_PARAMS[game];
  if (!gameData || !isRecord(gameData.params)) {
    return [];
  }

  const citations: Citation[] = [];

  for (const [itemTypeKey, itemParams] of Object.entries(gameData.params)) {
    const itemTypeNumber = Number.parseInt(itemTypeKey, 10);
    if (Number.isNaN(itemTypeNumber) || !isRecord(itemParams)) {
      continue;
    }

    for (const parameterName of ["p0", "p1", "p2", "p3"] as const) {
      const param = itemParams[parameterName];
      if (!isParamDescription(param)) {
        continue;
      }

      for (const citation of extractParamCitations(param)) {
        citations.push({
          game,
          itemType: itemTypeKey,
          itemTypeNumber,
          parameterName,
          citation,
          sourceFile: gameData.sourceFile,
        });
      }
    }
  }

  return citations;
}

export function getMissingCitations(game: string): MissingCitationEntry[] {
  const gameData = GAME_ITEM_PARAMS[game];
  if (!gameData || !isRecord(gameData.params)) {
    return [];
  }

  const missing: MissingCitationEntry[] = [];

  for (const [itemTypeKey, itemParams] of Object.entries(gameData.params)) {
    const itemTypeNumber = Number.parseInt(itemTypeKey, 10);
    if (Number.isNaN(itemTypeNumber) || !isRecord(itemParams)) {
      continue;
    }

    for (const parameterName of ["p0", "p1", "p2", "p3"] as const) {
      const param = itemParams[parameterName];
      if (!isParamDescription(param) || param === "Unused" || param === "Unknown") {
        continue;
      }

      const citations = extractParamCitations(param);
      if (citations.length === 0) {
        missing.push({
          game,
          itemType: itemTypeNumber,
          parameterName,
          reason:
            param.type === "Bit Flags"
              ? "missing_flag_citation"
              : "missing_default_citation",
        });
        continue;
      }

      for (const citation of citations) {
        if (!citation.url.trim()) {
          missing.push({
            game,
            itemType: itemTypeNumber,
            parameterName,
            reason: "missing_citation_url",
          });
        }
        if (citation.lineNumber < 1) {
          missing.push({
            game,
            itemType: itemTypeNumber,
            parameterName,
            reason: "invalid_line_number",
          });
        }
      }
    }
  }

  return missing;
}

export function getAllMissingCitations(): MissingCitationEntry[] {
  return Object.keys(GAME_ITEM_PARAMS).flatMap((game) => getMissingCitations(game));
}

export function extractAllCitations(): Citation[] {
  return Object.keys(GAME_ITEM_PARAMS).flatMap((game) => extractCitations(game));
}

export function getGamesWithItemParams(): string[] {
  return Object.keys(GAME_ITEM_PARAMS);
}

export function getCitationCount(game: string): number {
  return extractCitations(game).length;
}

export function getAllCitationCounts(): Record<string, number> {
  return Object.fromEntries(
    Object.keys(GAME_ITEM_PARAMS).map((game) => [game, getCitationCount(game)]),
  );
}
