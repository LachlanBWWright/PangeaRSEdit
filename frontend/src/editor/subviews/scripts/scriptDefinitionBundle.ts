import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { err, ok, Result } from "neverthrow";
import { z } from "zod";
import type {
  ScriptCustomObjectDefinition,
  ScriptWorkspaceContext,
  ScriptWorkspaceState,
} from "./scriptWorkspaceState";
import { scriptCustomObjectDefinitionSchema } from "./scriptWorkspaceStateTypes";

const definitionBundleManifestSchema = z.object({
  schemaVersion: z.literal(1),
  gameId: z.string().min(1),
  definitions: z.array(scriptCustomObjectDefinitionSchema),
  sourcePaths: z.array(z.string().min(1)),
  assetPaths: z.array(z.string().min(1)),
});

export interface ScriptDefinitionBundle {
  readonly gameId: string;
  readonly definitions: readonly ScriptCustomObjectDefinition[];
  readonly sources: Readonly<Record<string, string>>;
  readonly assets: Readonly<Record<string, Uint8Array>>;
}

function assetPathsForDefinition(
  definition: ScriptCustomObjectDefinition,
): readonly string[] {
  if (
    definition.visual.kind !== "customDisplayGroup" &&
    definition.visual.kind !== "customSkeleton"
  ) {
    return [];
  }
  return definition.visual.kind === "customDisplayGroup"
    ? [definition.visual.modelPath]
    : [definition.visual.modelPath, definition.visual.skeletonPath];
}

export function buildScriptDefinitionBundle(
  state: ScriptWorkspaceState,
): Result<Uint8Array, string> {
  const sourcePaths = state.customObjects.map((definition) => definition.sourceFilePath);
  const assetPaths = state.customObjects.flatMap(assetPathsForDefinition);
  const missingSource = sourcePaths.find((path) => !state.sourceFiles[path]);
  if (missingSource) return err(`Definition source is missing: ${missingSource}`);
  const missingAsset = assetPaths.find((path) => !state.assets[path]);
  if (missingAsset) return err(`Definition asset is missing: ${missingAsset}`);

  const manifest = {
    schemaVersion: 1 as const,
    gameId: state.context.gameId,
    definitions: [...state.customObjects],
    sourcePaths: [...new Set(sourcePaths)].sort(),
    assetPaths: [...new Set(assetPaths)].sort(),
  };
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  };
  for (const path of manifest.sourcePaths) files[path] = strToU8(state.sourceFiles[path]?.content ?? "");
  for (const path of manifest.assetPaths) files[path] = state.assets[path]?.bytes ?? new Uint8Array();
  return Result.fromThrowable(() => zipSync(files, { level: 6 }), () => "Failed to build definition bundle")();
}

export function importScriptDefinitionBundle(
  bytes: Uint8Array,
  context: ScriptWorkspaceContext,
): Result<ScriptDefinitionBundle, string> {
  const unzipResult = Result.fromThrowable(() => unzipSync(bytes), () => "Failed to read definition bundle")();
  if (unzipResult.isErr()) return err(unzipResult.error);
  const files = unzipResult.value;
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) return err("Definition bundle is missing manifest.json");
  const jsonResult = Result.fromThrowable(() => JSON.parse(strFromU8(manifestBytes)), () => "Failed to parse definition bundle manifest")();
  if (jsonResult.isErr()) return err(jsonResult.error);
  const manifest = definitionBundleManifestSchema.safeParse(jsonResult.value);
  if (!manifest.success) return err(`Invalid definition bundle manifest: ${manifest.error.message}`);
  if (manifest.data.gameId !== context.gameId) return err(`Definition bundle targets ${manifest.data.gameId}, not ${context.gameId}`);

  const sources: Record<string, string> = {};
  for (const path of manifest.data.sourcePaths) {
    const source = files[path];
    if (!source) return err(`Definition bundle is missing source: ${path}`);
    sources[path] = strFromU8(source);
  }
  const assets: Record<string, Uint8Array> = {};
  for (const path of manifest.data.assetPaths) {
    const asset = files[path];
    if (!asset) return err(`Definition bundle is missing asset: ${path}`);
    assets[path] = asset;
  }
  return ok({ gameId: manifest.data.gameId, definitions: manifest.data.definitions, sources, assets });
}
