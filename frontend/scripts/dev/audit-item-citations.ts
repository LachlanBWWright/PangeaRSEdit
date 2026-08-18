#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResultAsync } from "neverthrow";
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
  getGitHubPermalink,
  type GameRepository,
} from "../../src/validation/gameRepositories";
import { collectLevelParamCoverage } from "./audit-level-param-coverage";

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

interface SourceFunction {
  readonly fileName: string;
  readonly name: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly paramIndexes: readonly number[];
  readonly calledFunctions: readonly string[];
}

const PARAM_NAMES = ["p0", "p1", "p2", "p3"] as const;
const C_CONTROL_KEYWORDS = new Set(["if", "for", "while", "switch", "sizeof"]);

function getParamName(paramIndex: number): (typeof PARAM_NAMES)[number] | null {
  return PARAM_NAMES[paramIndex] ?? null;
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
    .replace(/\s+/g, "");
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

  const sourceDirectory = path.join(
    SOURCE_ROOT,
    normalizeRepoFolderName(repository),
    repository.sourcePath,
  );
  const resolvedPath = path.resolve(sourceDirectory, relativeFileName);
  return resolvedPath.startsWith(`${sourceDirectory}${path.sep}`)
    ? resolvedPath
    : null;
}

async function readCachedFile(filePath: string): Promise<string | null> {
  const cached = fileCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }

  const fileResult = await ResultAsync.fromPromise(
    readFile(filePath, "utf8"),
    () => null,
  );
  return fileResult.match((fileText) => {
    fileCache.set(filePath, fileText);
    return fileText;
  }, () => {
    fileCache.set(filePath, "");
    return null;
  });
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

export function citationMatchesSourceLine(
  citation: Citation,
  fileText: string,
  paramIndex: number,
): boolean {
  const snippet = normalizeCitationSnippet(citation.code);
  if (snippet.length === 0 || citation.lineNumber < 1) {
    return false;
  }

  const lines = fileText.split(/\r?\n/);
  const codeLineCount = citation.code.split(/\r?\n/).length;
  const endLine = citation.endLineNumber ?? citation.lineNumber + codeLineCount - 1;
  if (endLine > lines.length || endLine < citation.lineNumber) {
    return false;
  }

  const citedText = lines.slice(citation.lineNumber - 1, endLine).join("\n");
  const paramPattern = new RegExp(`parm\\s*\\[\\s*${String(paramIndex)}\\s*\\]`);
  return paramPattern.test(citedText)
    && normalizeCitationSnippet(citedText).includes(snippet);
}

function validateObservedValue(
  param: ParamDescription,
  value: number,
): string | null {
  if (param === "Unused") {
    return null;
  }
  if (param === "Unknown") {
    return "is unknown";
  }
  if (param.type === "TypeSelector" && param.options[value] === undefined) {
    return `has undocumented selector value ${String(value)}`;
  }
  if (param.type === "Rotation" && (value < 0 || value >= param.divisions)) {
    return `has rotation value ${String(value)} outside 0-${String(param.divisions - 1)}`;
  }
  return null;
}

async function auditObservedLevelCoverage(): Promise<AuditFailure[]> {
  const coverage = await collectLevelParamCoverage();
  const datasetsByLabel = new Map(
    PARAM_DATASETS.map((dataset) => [dataset.label, dataset]),
  );
  const failures: AuditFailure[] = [];

  for (const [label, result] of coverage) {
    for (const failure of result.failures) {
      failures.push({ category: "param", label, itemType: -1, detail: failure.detail });
    }
    const dataset = datasetsByLabel.get(label);
    if (!dataset) {
      failures.push({ category: "param", label, itemType: -1, detail: "parameter dataset is missing" });
      continue;
    }
    for (const observation of result.observations) {
      const paramName = getParamName(observation.paramIndex);
      if (paramName === null) continue;
      const param = dataset.params[observation.itemType]?.[paramName];
      if (!param) {
        const levels = observation.levelNames.join(", ");
        failures.push({
          category: "param",
          label,
          itemType: observation.itemType,
          detail: `${paramName}=${String(observation.value)} occurs in ${levels}, but the item has no parameter metadata.`,
        });
        continue;
      }
      const invalidReason = validateObservedValue(param, observation.value);
      if (invalidReason !== null) {
        const levels = observation.levelNames.join(", ");
        failures.push({
          category: "param",
          label,
          itemType: observation.itemType,
          detail: `${paramName}=${String(observation.value)} occurs in ${levels}, but ${paramName} ${invalidReason}.`,
        });
      }
    }
  }
  return failures;
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
        const expectedUrl = getGitHubPermalink(
          dataset.gameKey,
          citation.fileName,
          citation.lineNumber,
        );
        if (expectedUrl === null || citation.url !== expectedUrl) {
          failures.push({
            category: "param",
            label: dataset.label,
            itemType,
            detail: `${paramName} citation "${citation.label}" does not link to the relevant game and source line.`,
          });
        }
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
        const matchesSource = Number.isNaN(paramIndex)
          ? false
          : citationMatchesSourceLine(citation, fileText, paramIndex);

        if (!matchesSource) {
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

function findClosingBrace(fileText: string, openingBrace: number): number | null {
  let depth = 0;
  for (let index = openingBrace; index < fileText.length; index += 1) {
    const character = fileText[index];
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return index;
  }
  return null;
}

function lineNumberAt(fileText: string, offset: number): number {
  return fileText.slice(0, offset).split("\n").length;
}

function maskCComments(fileText: string): string {
  return fileText.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
}

function sourceFunctionKey(sourceFunction: SourceFunction): string {
  return `${sourceFunction.fileName}\0${sourceFunction.name}`;
}

export function extractTerrainItemFunctions(
  fileName: string,
  fileText: string,
): readonly SourceFunction[] {
  const functions: SourceFunction[] = [];
  const searchableText = maskCComments(fileText);
  const signaturePattern = /\b([A-Za-z_]\w*)\s*\([^;{}]*(?:TerrainItemEntryType|ObjectEntryType)\s*\*\s*itemPtr[^;{}]*\)\s*\{/g;
  for (const match of searchableText.matchAll(signaturePattern)) {
    if (match.index === undefined) continue;
    const name = match[1];
    if (!name) continue;
    const openingBrace = searchableText.indexOf("{", match.index);
    const closingBrace = findClosingBrace(searchableText, openingBrace);
    if (closingBrace === null) continue;
    const body = searchableText.slice(openingBrace, closingBrace + 1);
    const paramIndexes = new Set<number>();
    for (const paramMatch of body.matchAll(/itemPtr\s*->\s*parm\s*\[\s*([0-3])\s*\]/g)) {
      const rawIndex = paramMatch[1];
      if (rawIndex) paramIndexes.add(Number.parseInt(rawIndex, 10));
    }
    const calledFunctions = new Set<string>();
    for (const callMatch of body.matchAll(/\b([A-Za-z_]\w*)\s*\([^;{}]*\bitemPtr\b[^;{}]*\)/g)) {
      const calledFunction = callMatch[1];
      if (
        calledFunction
        && calledFunction !== name
        && !C_CONTROL_KEYWORDS.has(calledFunction)
      ) {
        calledFunctions.add(calledFunction);
      }
    }
    if (paramIndexes.size === 0 && calledFunctions.size === 0) continue;
    functions.push({
      fileName,
      name,
      startLine: lineNumberAt(fileText, match.index),
      endLine: lineNumberAt(fileText, closingBrace),
      paramIndexes: [...paramIndexes],
      calledFunctions: [...calledFunctions],
    });
  }
  return functions;
}

export function extractTerrainDispatch(
  fileText: string,
  tableName = "gTerrainItemAddRoutines",
): ReadonlyMap<string, readonly number[]> {
  const dispatch = new Map<string, number[]>();
  const tableStart = fileText.indexOf(tableName);
  if (tableStart < 0) return dispatch;
  const openingBrace = fileText.indexOf("{", tableStart);
  const closingBrace = findClosingBrace(fileText, openingBrace);
  if (openingBrace < 0 || closingBrace === null) return dispatch;
  const entries = fileText.slice(openingBrace + 1, closingBrace).split("\n");
  let itemType = 0;
  for (const entry of entries) {
    const routine = entry.match(/^\s*([A-Za-z_]\w*)\s*,/)?.[1];
    if (!routine) continue;
    const itemTypes = dispatch.get(routine) ?? [];
    itemTypes.push(itemType);
    dispatch.set(routine, itemTypes);
    itemType += 1;
  }
  return dispatch;
}

async function listCFiles(directory: string): Promise<readonly string[]> {
  const entriesResult = await ResultAsync.fromPromise(
    readdir(directory, { withFileTypes: true }),
    () => null,
  );
  if (entriesResult.isErr()) return [];
  const files: string[] = [];
  for (const entry of entriesResult.value) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listCFiles(entryPath)));
    if (entry.isFile() && entry.name.endsWith(".c")) files.push(entryPath);
  }
  return files;
}

function hasCitationInFunction(
  param: ParamDescription,
  sourceFunction: SourceFunction,
): boolean {
  return collectParamCitations(param).some((citation) => {
    const normalizedCitationFile = citation.fileName.replace(/^.*?(?:src|Source)\//, "");
    const normalizedSourceFile = sourceFunction.fileName.replace(/^.*?(?:src|Source)\//, "");
    return normalizedCitationFile === normalizedSourceFile
      && citation.lineNumber >= sourceFunction.startLine
      && citation.lineNumber <= sourceFunction.endLine;
  });
}

async function auditSourceCoverage(dataset: ParamAuditDataset): Promise<AuditFailure[]> {
  const repository = GAME_REPOSITORIES[dataset.gameKey];
  if (!repository) {
    return [{ category: "param", label: dataset.label, itemType: -1, detail: "Game repository metadata is missing." }];
  }
  const sourceDirectory = path.join(
    SOURCE_ROOT,
    normalizeRepoFolderName(repository),
    repository.sourcePath,
  );
  const isMightyMike = dataset.gameKey === "mightymike";
  const terrainFile = isMightyMike
    ? path.join(sourceDirectory, "Playfield", "Playfield.c")
    : path.join(sourceDirectory, "Terrain", "Terrain2.c");
  const terrainText = await readCachedFile(terrainFile);
  if (terrainText === null) {
    return [{ category: "param", label: dataset.label, itemType: -1, detail: "Terrain dispatch source is missing." }];
  }
  const dispatch = extractTerrainDispatch(
    terrainText,
    isMightyMike ? "gItemAddPtrs" : "gTerrainItemAddRoutines",
  );
  const failures: AuditFailure[] = [];
  const sourceFunctions: SourceFunction[] = [];
  for (const filePath of await listCFiles(sourceDirectory)) {
    const fileText = await readCachedFile(filePath);
    if (fileText === null) continue;
    const relativeFile = path.relative(sourceDirectory, filePath);
    sourceFunctions.push(...extractTerrainItemFunctions(relativeFile, fileText));
  }
  const functionsByName = new Map<string, SourceFunction[]>();
  for (const sourceFunction of sourceFunctions) {
    const namedFunctions = functionsByName.get(sourceFunction.name) ?? [];
    namedFunctions.push(sourceFunction);
    functionsByName.set(sourceFunction.name, namedFunctions);
  }
  for (const [routineName, itemTypes] of dispatch) {
    const pending = sourceFunctions.filter(
      (sourceFunction) => sourceFunction.name === routineName,
    );
    const visited = new Set<string>();
    while (pending.length > 0) {
      const sourceFunction = pending.pop();
      if (!sourceFunction) continue;
      const functionKey = sourceFunctionKey(sourceFunction);
      if (visited.has(functionKey)) continue;
      visited.add(functionKey);
      for (const calledFunction of sourceFunction.calledFunctions) {
        const localMatches = functionsByName.get(calledFunction) ?? [];
        pending.push(
          ...localMatches.filter((candidate) =>
            candidate.fileName === sourceFunction.fileName,
          ),
        );
      }
      for (const itemType of itemTypes) {
        const params = dataset.params[itemType];
        for (const paramIndex of sourceFunction.paramIndexes) {
          const paramName = getParamName(paramIndex);
          if (paramName === null) continue;
          const param = params?.[paramName];
          if (!param || param === "Unused" || param === "Unknown") {
            failures.push({
              category: "param",
              label: dataset.label,
              itemType,
              detail: `${paramName} is read by ${sourceFunction.name} in ${sourceFunction.fileName}:${sourceFunction.startLine} but is not documented.`,
            });
          } else if (!hasCitationInFunction(param, sourceFunction)) {
            failures.push({
              category: "param",
              label: dataset.label,
              itemType,
              detail: `${paramName} is read by ${sourceFunction.name} in ${sourceFunction.fileName}:${sourceFunction.startLine}-${sourceFunction.endLine} but has no citation in that routine.`,
            });
          }
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

export async function run(): Promise<void> {
  const failures: AuditFailure[] = [];

  for (const dataset of PARAM_DATASETS) {
    failures.push(...(await auditParamDataset(dataset)));
    failures.push(...(await auditSourceCoverage(dataset)));
  }

  for (const dataset of MODEL_DATASETS) {
    failures.push(...(await auditModelDataset(dataset)));
  }
  failures.push(...(await auditObservedLevelCoverage()));

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

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  void run();
}
