#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { Game } from "../../src/data/globals/globals";
import { bugdom2ItemTypeParams } from "../../src/data/items/bugdom2ItemType";
import { bugdomItemTypeParams } from "../../src/data/items/bugdomItemType";
import { billyFrontierItemTypeParams } from "../../src/data/items/billyFrontierItemType";
import { croMagItemTypeParams } from "../../src/data/items/croMagItemType";
import {
  type Citation,
  type ItemParams,
  type ParamDescription,
} from "../../src/data/items/itemParams";
import { type SourceCitation } from "../../src/data/items/itemModelTypes";
import { getGameMapper } from "../../src/data/items/mappers";
import { mightyMikeItemParams } from "../../src/data/items/mightyMikeItemParams";
import { nanosaur2ItemTypeParams } from "../../src/data/items/nanosaur2ItemType";
import { nanosaurItemTypeParams } from "../../src/data/items/nanosaurItemType";
import { TerrainItemTypeParams } from "../../src/data/items/ottoItemType";
import {
  GAME_REPOSITORIES,
  type GameRepository,
} from "../../src/validation/gameRepositories";

type ItemParamsMap = Partial<Record<number, ItemParams>>;

interface ParamAuditDataset {
  readonly gameKey: keyof typeof GAME_REPOSITORIES;
  readonly label: string;
  readonly params: ItemParamsMap;
}

interface ModelAuditDataset {
  readonly game: Game;
  readonly gameKey: keyof typeof GAME_REPOSITORIES;
  readonly label: string;
}

interface AuditFailure {
  readonly category: "param" | "model";
  readonly label: string;
  readonly itemType: number;
  readonly detail: string;
}

const PARAM_DATASETS: readonly ParamAuditDataset[] = [
  { gameKey: "ottomatic", label: "Otto Matic", params: TerrainItemTypeParams },
  { gameKey: "bugdom", label: "Bugdom", params: bugdomItemTypeParams },
  { gameKey: "bugdom2", label: "Bugdom 2", params: bugdom2ItemTypeParams },
  { gameKey: "nanosaur", label: "Nanosaur", params: nanosaurItemTypeParams },
  {
    gameKey: "nanosaur2",
    label: "Nanosaur 2",
    params: nanosaur2ItemTypeParams,
  },
  { gameKey: "cromag", label: "Cro-Mag Rally", params: croMagItemTypeParams },
  {
    gameKey: "billyfrontier",
    label: "Billy Frontier",
    params: billyFrontierItemTypeParams,
  },
  { gameKey: "mightymike", label: "Mighty Mike", params: mightyMikeItemParams },
];

const MODEL_DATASETS: readonly ModelAuditDataset[] = [
  { game: Game.OTTO_MATIC, gameKey: "ottomatic", label: "Otto Matic" },
  { game: Game.BUGDOM, gameKey: "bugdom", label: "Bugdom" },
  { game: Game.BUGDOM_2, gameKey: "bugdom2", label: "Bugdom 2" },
  { game: Game.NANOSAUR, gameKey: "nanosaur", label: "Nanosaur" },
  { game: Game.NANOSAUR_2, gameKey: "nanosaur2", label: "Nanosaur 2" },
  { game: Game.CRO_MAG, gameKey: "cromag", label: "Cro-Mag Rally" },
  {
    game: Game.BILLY_FRONTIER,
    gameKey: "billyfrontier",
    label: "Billy Frontier",
  },
];

const SOURCE_ROOT = path.resolve(process.cwd(), "../games/originals");
const fileCache = new Map<string, string>();

function normalizeRepoFolderName(repository: GameRepository): string {
  return repository.repo.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function normalizeCitationSnippet(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\/\/.*$/gm, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function resolveCitationPath(
  gameKey: keyof typeof GAME_REPOSITORIES,
  fileName: string,
): string | null {
  const repository = GAME_REPOSITORIES[gameKey];
  if (!repository) {
    return null;
  }

  const trimmedFileName = fileName.replace(/^\/+/, "");
  const sourcePrefix = `${repository.sourcePath}/`;
  const relativeFileName = trimmedFileName.startsWith(sourcePrefix)
    ? trimmedFileName.slice(sourcePrefix.length)
    : trimmedFileName;

  return path.join(
    SOURCE_ROOT,
    normalizeRepoFolderName(repository),
    repository.sourcePath,
    relativeFileName,
  );
}

async function readCachedFile(filePath: string): Promise<string | null> {
  const cached = fileCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }

  try {
    await access(filePath);
    const fileText = await readFile(filePath, "utf8");
    fileCache.set(filePath, fileText);
    return fileText;
  } catch {
    fileCache.set(filePath, "");
    return null;
  }
}

function collectParamCitations(param: ParamDescription): readonly Citation[] {
  if (param === "Unused" || param === "Unknown") {
    return [];
  }

  if (param.type === "Bit Flags") {
    return param.flags.flatMap((flag) => [
      flag.defaultCitation,
      ...(flag.additionalCitations ?? []),
    ]);
  }

  return [param.defaultCitation, ...(param.additionalCitations ?? [])];
}

function citationMatchesSource(citation: Citation, fileText: string): boolean {
  const snippet = normalizeCitationSnippet(citation.code);
  if (snippet.length === 0) {
    return true;
  }

  return normalizeCitationSnippet(fileText).includes(snippet);
}

function citationMentionsParamNearLine(
  citation: Citation,
  fileText: string,
  paramIndex: number,
): boolean {
  const lines = fileText.split(/\r?\n/);
  const startIndex = Math.max(0, citation.lineNumber - 3);
  const endIndex = Math.min(lines.length, citation.lineNumber + 2);
  const windowText = lines.slice(startIndex, endIndex).join("\n");
  return windowText.includes(`parm[${String(paramIndex)}]`);
}

async function auditParamDataset(
  dataset: ParamAuditDataset,
): Promise<AuditFailure[]> {
  const failures: AuditFailure[] = [];

  for (const [rawItemType, params] of Object.entries(dataset.params)) {
    if (!params) {
      continue;
    }

    const itemType = Number.parseInt(rawItemType, 10);
    if (Number.isNaN(itemType)) {
      continue;
    }

    const paramEntries = [
      ["p0", params.p0],
      ["p1", params.p1],
      ["p2", params.p2],
      ["p3", params.p3],
    ] as const;

    for (const [paramName, param] of paramEntries) {
      const citations = collectParamCitations(param);
      if (param !== "Unused" && param !== "Unknown" && citations.length === 0) {
        failures.push({
          category: "param",
          label: dataset.label,
          itemType,
          detail: `${paramName} has no code citations.`,
        });
        continue;
      }

      for (const citation of citations) {
        const citationPath = resolveCitationPath(
          dataset.gameKey,
          citation.fileName,
        );
        if (!citationPath) {
          failures.push({
            category: "param",
            label: dataset.label,
            itemType,
            detail: `${paramName} citation "${citation.label}" could not resolve a source path.`,
          });
          continue;
        }

        const fileText = await readCachedFile(citationPath);
        if (fileText === null) {
          failures.push({
            category: "param",
            label: dataset.label,
            itemType,
            detail: `${paramName} citation "${citation.label}" points to missing file ${citation.fileName}.`,
          });
          continue;
        }

        const paramIndex = Number.parseInt(paramName.slice(1), 10);
        const matchesSource = citationMatchesSource(citation, fileText);
        const matchesParamWindow = Number.isNaN(paramIndex)
          ? false
          : citationMentionsParamNearLine(citation, fileText, paramIndex);

        if (!matchesSource && !matchesParamWindow) {
          failures.push({
            category: "param",
            label: dataset.label,
            itemType,
            detail: `${paramName} citation "${citation.label}" does not match ${citation.fileName}:${citation.lineNumber}.`,
          });
        }
      }
    }
  }

  return failures;
}

async function auditModelDataset(
  dataset: ModelAuditDataset,
): Promise<AuditFailure[]> {
  const failures: AuditFailure[] = [];
  const mapper = getGameMapper(dataset.game);
  if (!mapper) {
    return failures;
  }

  for (const itemType of mapper.getMappedTypes()) {
    const mapping = mapper.getMapping(itemType);
    const citations: readonly SourceCitation[] = [
      ...(mapping?.citations ?? []),
      ...(mapping?.semanticCitations ?? []),
      ...(mapping?.modelParts ?? []).flatMap((part) => part.citations),
    ];

    for (const citation of citations) {
      const citationPath = resolveCitationPath(dataset.gameKey, citation.file);
      if (!citationPath) {
        failures.push({
          category: "model",
          label: dataset.label,
          itemType,
          detail: `Model citation "${citation.description}" could not resolve a source path.`,
        });
        continue;
      }

      const fileText = await readCachedFile(citationPath);
      if (fileText === null) {
        failures.push({
          category: "model",
          label: dataset.label,
          itemType,
          detail: `Model citation "${citation.description}" points to missing file ${citation.file}.`,
        });
      }
    }
  }

  return failures;
}

async function run(): Promise<void> {
  const failures: AuditFailure[] = [];

  for (const dataset of PARAM_DATASETS) {
    failures.push(...(await auditParamDataset(dataset)));
  }

  for (const dataset of MODEL_DATASETS) {
    failures.push(...(await auditModelDataset(dataset)));
  }

  if (failures.length === 0) {
    console.log("Item citation audit passed.");
    return;
  }

  failures.forEach((failure) => {
    console.log(
      `[${failure.category}] ${failure.label} item ${failure.itemType}: ${failure.detail}`,
    );
  });
  console.log(`Found ${failures.length} citation issue(s).`);
  process.exitCode = 1;
}

void run();
