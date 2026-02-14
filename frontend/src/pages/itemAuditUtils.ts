import { Game } from "@/data/globals/globals";
import { getGameMapper } from "@/data/items/mappers";
import { TerrainItemTypeParams, itemTypeNames as ottoItemTypeNames } from "@/data/items/ottoItemType";
import { bugdomItemTypeParams, itemTypeNames as bugdomItemTypeNames } from "@/data/items/bugdomItemType";
import { bugdom2ItemTypeParams, itemTypeNames as bugdom2ItemTypeNames } from "@/data/items/bugdom2ItemType";
import { nanosaurItemTypeParams, itemTypeNames as nanosaurItemTypeNames } from "@/data/items/nanosaurItemType";
import { nanosaur2ItemTypeParams, itemTypeNames as nanosaur2ItemTypeNames } from "@/data/items/nanosaur2ItemType";
import { croMagItemTypeParams, itemTypeNames as croMagItemTypeNames } from "@/data/items/croMagItemType";
import { billyFrontierItemTypeParams, itemTypeNames as billyFrontierItemTypeNames } from "@/data/items/billyFrontierItemType";
import { itemTypeNames as mightyMikeItemTypeNames } from "@/data/items/mightyMikeItemType";
import type { ItemParams, ParamDescription } from "@/data/items/itemParams";

export type ParamStatus = "unknown" | "correct" | "incorrect";

export interface ItemAuditDecision {
  modelStatus: ParamStatus;
  paramStatus: {
    p0: ParamStatus;
    p1: ParamStatus;
    p2: ParamStatus;
    p3: ParamStatus;
  };
  notes: string;
}

export interface ItemAuditEntry {
  itemType: number;
  itemName: string;
  hasModelMapping: boolean;
  modelMappingFile: string | null;
  paramDescriptions: {
    p0: string;
    p1: string;
    p2: string;
    p3: string;
  };
  decision: ItemAuditDecision;
}

interface GameAuditConfig {
  game: Game;
  label: string;
  itemNames: Record<number, string>;
  itemParams?: Record<number, ItemParams>;
}

const GAME_AUDIT_CONFIGS: readonly GameAuditConfig[] = [
  { game: Game.OTTO_MATIC, label: "Otto Matic", itemNames: ottoItemTypeNames, itemParams: TerrainItemTypeParams },
  { game: Game.BUGDOM, label: "Bugdom", itemNames: bugdomItemTypeNames, itemParams: bugdomItemTypeParams },
  { game: Game.BUGDOM_2, label: "Bugdom 2", itemNames: bugdom2ItemTypeNames, itemParams: bugdom2ItemTypeParams },
  { game: Game.NANOSAUR, label: "Nanosaur", itemNames: nanosaurItemTypeNames, itemParams: nanosaurItemTypeParams },
  { game: Game.NANOSAUR_2, label: "Nanosaur 2", itemNames: nanosaur2ItemTypeNames, itemParams: nanosaur2ItemTypeParams },
  { game: Game.CRO_MAG, label: "Cro-Mag Rally", itemNames: croMagItemTypeNames, itemParams: croMagItemTypeParams },
  { game: Game.BILLY_FRONTIER, label: "Billy Frontier", itemNames: billyFrontierItemTypeNames, itemParams: billyFrontierItemTypeParams },
  { game: Game.MIGHTY_MIKE, label: "Mighty Mike", itemNames: mightyMikeItemTypeNames },
];

function summarizeParamDescription(param: ParamDescription | undefined): string {
  if (param === undefined) {
    return "Unknown";
  }
  if (param === "Unused" || param === "Unknown") {
    return param;
  }
  if (param.type === "Integer") {
    return param.description;
  }
  return `Bit Flags (${param.flags.length})`;
}

function createDefaultDecision(): ItemAuditDecision {
  return {
    modelStatus: "unknown",
    paramStatus: { p0: "unknown", p1: "unknown", p2: "unknown", p3: "unknown" },
    notes: "",
  };
}

export function getItemAuditConfigs(): readonly GameAuditConfig[] {
  return GAME_AUDIT_CONFIGS;
}

export function buildItemAuditEntries(
  game: Game,
  decisions: Record<number, ItemAuditDecision>,
): ItemAuditEntry[] {
  const config = GAME_AUDIT_CONFIGS.find((entry) => entry.game === game);
  if (!config) {
    return [];
  }
  const mapper = getGameMapper(game);
  const typeIds = Object.keys(config.itemNames)
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);

  return typeIds.map((itemType) => {
    const itemParams = config.itemParams?.[itemType];
    const mapping = mapper?.getMapping(itemType);
    return {
      itemType,
      itemName: config.itemNames[itemType] ?? `Item ${itemType}`,
      hasModelMapping: mapping !== undefined,
      modelMappingFile: mapping?.modelFile ?? null,
      paramDescriptions: {
        p0: summarizeParamDescription(itemParams?.p0),
        p1: summarizeParamDescription(itemParams?.p1),
        p2: summarizeParamDescription(itemParams?.p2),
        p3: summarizeParamDescription(itemParams?.p3),
      },
      decision: decisions[itemType] ?? createDefaultDecision(),
    };
  });
}

export function createItemAuditReport(game: Game, decisions: Record<number, ItemAuditDecision>) {
  const config = GAME_AUDIT_CONFIGS.find((entry) => entry.game === game);
  return {
    generatedAt: new Date().toISOString(),
    game,
    gameName: config?.label ?? "Unknown",
    entries: buildItemAuditEntries(game, decisions),
  };
}
