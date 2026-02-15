import { Game } from "@/data/globals/globals";
import { getGameMapper } from "@/data/items/mappers";
import {
  TerrainItemTypeParams,
  itemTypeNames as ottoItemTypeNames,
} from "@/data/items/ottoItemType";
import {
  bugdomItemTypeParams,
  itemTypeNames as bugdomItemTypeNames,
} from "@/data/items/bugdomItemType";
import {
  bugdom2ItemTypeParams,
  itemTypeNames as bugdom2ItemTypeNames,
} from "@/data/items/bugdom2ItemType";
import {
  nanosaurItemTypeParams,
  itemTypeNames as nanosaurItemTypeNames,
} from "@/data/items/nanosaurItemType";
import {
  nanosaur2ItemTypeParams,
  itemTypeNames as nanosaur2ItemTypeNames,
} from "@/data/items/nanosaur2ItemType";
import {
  croMagItemTypeParams,
  itemTypeNames as croMagItemTypeNames,
} from "@/data/items/croMagItemType";
import {
  billyFrontierItemTypeParams,
  itemTypeNames as billyFrontierItemTypeNames,
} from "@/data/items/billyFrontierItemType";
import { itemTypeNames as mightyMikeItemTypeNames } from "@/data/items/mightyMikeItemType";
import { getCitationPermalink, type SourceCitation } from "@/data/items/itemModelTypes";
import type { CodeSample, ItemParams, ParamDescription } from "@/data/items/itemParams";

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

export interface ParamCitationDetail {
  fileName: string;
  lineNumber: number;
  code: string;
}

export interface ModelCitationDetail {
  file: string;
  line: number;
  endLine?: number;
  description: string;
  permalink: string;
}

export interface ParamAuditDetail {
  summary: string;
  citations: ParamCitationDetail[];
}

export interface ItemAuditEntry {
  itemType: number;
  itemName: string;
  hasModelMapping: boolean;
  modelMappingFile: string | null;
  modelMappingPath: "models" | "skeletons" | null;
  modelCitations: ModelCitationDetail[];
  paramDetails: {
    p0: ParamAuditDetail;
    p1: ParamAuditDetail;
    p2: ParamAuditDetail;
    p3: ParamAuditDetail;
  };
  decision: ItemAuditDecision;
}

export interface GameAuditConfig {
  game: Game;
  label: string;
  itemNames: Record<number, string>;
  itemParams?: Record<number, ItemParams>;
  basePath: string;
}

const GAME_AUDIT_CONFIGS: readonly GameAuditConfig[] = [
  {
    game: Game.OTTO_MATIC,
    label: "Otto Matic",
    itemNames: ottoItemTypeNames,
    itemParams: TerrainItemTypeParams,
    basePath: "/PangeaRSEdit/games/ottomatic",
  },
  {
    game: Game.BUGDOM,
    label: "Bugdom",
    itemNames: bugdomItemTypeNames,
    itemParams: bugdomItemTypeParams,
    basePath: "/PangeaRSEdit/games/bugdom1",
  },
  {
    game: Game.BUGDOM_2,
    label: "Bugdom 2",
    itemNames: bugdom2ItemTypeNames,
    itemParams: bugdom2ItemTypeParams,
    basePath: "/PangeaRSEdit/games/bugdom2",
  },
  {
    game: Game.NANOSAUR,
    label: "Nanosaur",
    itemNames: nanosaurItemTypeNames,
    itemParams: nanosaurItemTypeParams,
    basePath: "/PangeaRSEdit/games/nanosaur1",
  },
  {
    game: Game.NANOSAUR_2,
    label: "Nanosaur 2",
    itemNames: nanosaur2ItemTypeNames,
    itemParams: nanosaur2ItemTypeParams,
    basePath: "/PangeaRSEdit/games/nanosaur2",
  },
  {
    game: Game.CRO_MAG,
    label: "Cro-Mag Rally",
    itemNames: croMagItemTypeNames,
    itemParams: croMagItemTypeParams,
    basePath: "/PangeaRSEdit/games/cromagrally",
  },
  {
    game: Game.BILLY_FRONTIER,
    label: "Billy Frontier",
    itemNames: billyFrontierItemTypeNames,
    itemParams: billyFrontierItemTypeParams,
    basePath: "/PangeaRSEdit/games/billyfrontier",
  },
  {
    game: Game.MIGHTY_MIKE,
    label: "Mighty Mike",
    itemNames: mightyMikeItemTypeNames,
    basePath: "/PangeaRSEdit/games/mightymike",
  },
];

function toParamCitation(sample: CodeSample): ParamCitationDetail {
  return {
    fileName: sample.fileName,
    lineNumber: sample.lineNumber,
    code: sample.code,
  };
}

function paramAuditDetail(param: ParamDescription | undefined): ParamAuditDetail {
  if (param === undefined) {
    return { summary: "Unknown", citations: [] };
  }
  if (param === "Unused" || param === "Unknown") {
    return { summary: param, citations: [] };
  }
  if (param.type === "Integer") {
    const citations = param.codeSample ? [toParamCitation(param.codeSample)] : [];
    return { summary: param.description, citations };
  }
  const citations = param.flags
    .filter((flag) => flag.codeSample !== undefined)
    .map((flag) => toParamCitation(flag.codeSample));
  return { summary: `Bit Flags (${param.flags.length})`, citations };
}

function buildModelCitations(game: Game, citations: SourceCitation[] | undefined): ModelCitationDetail[] {
  if (!citations) {
    return [];
  }
  return citations.map((citation) => ({
    file: citation.file,
    line: citation.line,
    endLine: citation.endLine,
    description: citation.description,
    permalink: getCitationPermalink(game, citation),
  }));
}

export function createDefaultDecision(): ItemAuditDecision {
  return {
    modelStatus: "unknown",
    paramStatus: { p0: "unknown", p1: "unknown", p2: "unknown", p3: "unknown" },
    notes: "",
  };
}

export function getItemAuditConfigs(): readonly GameAuditConfig[] {
  return GAME_AUDIT_CONFIGS;
}

export function getItemAuditConfig(game: Game): GameAuditConfig | undefined {
  return GAME_AUDIT_CONFIGS.find((entry) => entry.game === game);
}

export function buildItemAuditEntries(
  game: Game,
  decisions: Record<number, ItemAuditDecision>,
): ItemAuditEntry[] {
  const config = getItemAuditConfig(game);
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
      modelMappingPath: mapping?.modelPath ?? null,
      modelCitations: buildModelCitations(game, mapping?.citations),
      paramDetails: {
        p0: paramAuditDetail(itemParams?.p0),
        p1: paramAuditDetail(itemParams?.p1),
        p2: paramAuditDetail(itemParams?.p2),
        p3: paramAuditDetail(itemParams?.p3),
      },
      decision: decisions[itemType] ?? createDefaultDecision(),
    };
  });
}

export function createItemAuditReport(
  game: Game,
  decisions: Record<number, ItemAuditDecision>,
) {
  const config = getItemAuditConfig(game);
  return {
    generatedAt: new Date().toISOString(),
    game,
    gameName: config?.label ?? "Unknown",
    entries: buildItemAuditEntries(game, decisions),
  };
}
