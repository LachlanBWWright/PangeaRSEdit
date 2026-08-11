import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { z } from "zod";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  MightyMikeGlobals,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
  type GlobalsInterface,
} from "../../src/data/globals/globals";
import { fixNullToZero } from "../../src/data/processors/nullToZeroFixer";
import { parseNanosaur1Level } from "../../src/data/processors/classicProprocessor";
import { parseMightyMikeMap } from "../../src/modelParsers/parseMightyMike";

export interface LevelParamObservation {
  readonly itemType: number;
  readonly paramIndex: number;
  readonly value: number;
  readonly levelNames: readonly string[];
}

export interface LevelCoverageFailure {
  readonly label: string;
  readonly detail: string;
}

export interface LevelCoverageResult {
  readonly observations: readonly LevelParamObservation[];
  readonly failures: readonly LevelCoverageFailure[];
}

interface LevelDataset {
  readonly key: string;
  readonly label: string;
  readonly globals: GlobalsInterface;
}

interface ObservedItem {
  readonly type: number;
  readonly p0: number;
  readonly p1: number;
  readonly p2: number;
  readonly p3: number;
}

const observedItemSchema = z.object({
  type: z.number().int(),
  p0: z.number().int(),
  p1: z.number().int(),
  p2: z.number().int(),
  p3: z.number().int(),
});
const resourceLevelSchema = z.object({
  Itms: z.object({
    1000: z.object({ obj: z.array(observedItemSchema) }),
  }).optional(),
}).passthrough();

const LEVEL_DATASETS: readonly LevelDataset[] = [
  { key: "ottoMatic", label: "Otto Matic", globals: OttoGlobals },
  { key: "bugdom", label: "Bugdom", globals: BugdomGlobals },
  { key: "bugdom2", label: "Bugdom 2", globals: Bugdom2Globals },
  { key: "nanosaur", label: "Nanosaur", globals: NanosaurGlobals },
  { key: "nanosaur2", label: "Nanosaur 2", globals: Nanosaur2Globals },
  { key: "croMag", label: "Cro-Mag Rally", globals: CroMagGlobals },
  { key: "billyFrontier", label: "Billy Frontier", globals: BillyFrontierGlobals },
  { key: "mightyMike", label: "Mighty Mike", globals: MightyMikeGlobals },
];

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isCanonicalLevelFile(dataset: LevelDataset, fileName: string): boolean {
  if (dataset.key === "nanosaur") return fileName.endsWith(".ter");
  if (dataset.key === "mightyMike") return /\.map-\d+$/.test(fileName);
  return fileName.endsWith(".ter.rsrc");
}

async function parseItems(
  dataset: LevelDataset,
  directory: string,
  fileName: string,
): Promise<Result<readonly ObservedItem[], string>> {
  const levelBytesResult = await ResultAsync.fromPromise(
    readFile(path.join(directory, fileName)),
    () => `could not read ${fileName}`,
  );
  if (levelBytesResult.isErr()) return err(levelBytesResult.error);
  const levelBuffer = copyToArrayBuffer(levelBytesResult.value);

  if (dataset.key === "mightyMike") {
    return parseMightyMikeMap(levelBuffer).map((level) => level.items);
  }
  if (dataset.key === "nanosaur") {
    return Result.fromThrowable(
      () => parseNanosaur1Level(levelBuffer),
      () => `${fileName} could not be parsed`,
    )().map((level) => level.objectList.map((item) => ({
      type: item.type,
      p0: item.parm[0],
      p1: item.parm[1],
      p2: item.parm[2],
      p3: item.parm[3],
    })));
  }

  const dumpResult = await ResultAsync.fromPromise(
    saveToJson(
      new Uint8Array(levelBuffer),
      dataset.globals.STRUCT_SPECS.filter((spec) => spec.startsWith("Itms:")),
      [],
      [],
    ),
    () => `${fileName} resource parsing failed`,
  );
  if (dumpResult.isErr()) return err(dumpResult.error);
  if (!dumpResult.value.ok) return err(`${fileName}: ${dumpResult.value.error}`);
  const jsonResult = Result.fromThrowable(
    () => JSON.parse(dumpResult.value.value),
    () => `${fileName} produced invalid JSON`,
  )();
  if (jsonResult.isErr()) return jsonResult;
  const recordResult = z.record(z.string(), z.unknown()).safeParse(jsonResult.value);
  if (!recordResult.success) return err(`${fileName} did not contain an object`);
  fixNullToZero(recordResult.data);
  const parsedLevel = resourceLevelSchema.safeParse(recordResult.data);
  if (!parsedLevel.success) return err(`${fileName} has invalid terrain items`);
  return ok(parsedLevel.data.Itms?.[1000].obj ?? []);
}

function observationKey(itemType: number, paramIndex: number, value: number): string {
  return `${String(itemType)}:${String(paramIndex)}:${String(value)}`;
}

export async function collectLevelParamCoverage(): Promise<ReadonlyMap<string, LevelCoverageResult>> {
  const results = new Map<string, LevelCoverageResult>();
  const assetsRoot = path.resolve(process.cwd(), "public/assets");

  for (const dataset of LEVEL_DATASETS) {
    console.log(`Auditing shipped ${dataset.label} levels...`);
    const directory = path.join(assetsRoot, dataset.key, "terrain");
    const directoryResult = await ResultAsync.fromPromise(
      readdir(directory),
      () => null,
    );
    if (directoryResult.isErr()) {
      results.set(dataset.label, {
        observations: [],
        failures: [{ label: dataset.label, detail: `level directory is missing: ${directory}` }],
      });
      continue;
    }

    const levelNames = directoryResult.value
      .filter((fileName) => isCanonicalLevelFile(dataset, fileName))
      .sort();
    const observedLevels = new Map<string, Set<string>>();
    const failures: LevelCoverageFailure[] = [];
    for (const levelName of levelNames) {
      const items = await parseItems(dataset, directory, levelName);
      if (items.isErr()) {
        failures.push({ label: dataset.label, detail: items.error });
        continue;
      }
      for (const item of items.value) {
        [item.p0, item.p1, item.p2, item.p3].forEach((value, paramIndex) => {
          if (value === 0) return;
          const key = observationKey(item.type, paramIndex, value);
          const levels = observedLevels.get(key) ?? new Set<string>();
          levels.add(levelName);
          observedLevels.set(key, levels);
        });
      }
    }
    if (levelNames.length === 0) {
      failures.push({ label: dataset.label, detail: "no included canonical levels were found" });
    }

    const observations = [...observedLevels.entries()].map(([key, levels]) => {
      const [itemType = 0, paramIndex = 0, value = 0] = key
        .split(":")
        .map((part) => Number.parseInt(part, 10));
      return { itemType, paramIndex, value, levelNames: [...levels].sort() };
    });
    results.set(dataset.label, { observations, failures });
  }
  return results;
}
