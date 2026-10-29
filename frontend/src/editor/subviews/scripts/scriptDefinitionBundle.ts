import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { err, ok, Result } from "neverthrow";
import { z } from "zod";
import type {
  ScriptCustomObjectDefinition,
  ScriptWorkspaceContext,
  ScriptWorkspaceState,
} from "./scriptWorkspaceState";
import { scriptCustomObjectDefinitionSchema } from "./scriptWorkspaceStateTypes";
import { collectDefinitionSources, collectSourceDependencies, definitionAssetPaths, isDefinitionAssetPath, isDefinitionSourcePath } from "./scriptDefinitionDependencies";
import type { PortableAssets } from "@pangea/desktop-contracts";
import { authoringArchiveFiles, collectScriptAuthoringAssets, readAuthoringArchiveFiles, type ScriptAuthoringExportOptions } from "./scriptAuthoringAttachments";
import { resolveDesktopProjectAssets } from "@/platform/desktop/projectScriptAssets";

const definitionBundleManifestSchema = z.object({
  schemaVersion: z.literal(1),
  gameId: z.string().min(1),
  definitions: z.array(scriptCustomObjectDefinitionSchema),
  sourcePaths: z.array(z.string().refine(isDefinitionSourcePath, "Invalid definition source path")),
  assetPaths: z.array(z.string().refine(isDefinitionAssetPath, "Invalid definition asset path")),
});

export interface ScriptDefinitionBundle {
  readonly gameId: string;
  readonly definitions: readonly ScriptCustomObjectDefinition[];
  readonly sources: Readonly<Record<string, string>>;
  readonly assets: Readonly<Record<string, Uint8Array>>;
  readonly authoringAssets?: PortableAssets | null;
}

export function buildScriptDefinitionBundle(
  state: ScriptWorkspaceState,
  authoringAssets: PortableAssets | null = state.authoringAssets ?? null,
  definitionIds?: readonly string[],
): Result<Uint8Array, string> {
  const selection = selectDefinitionBundleState(state, definitionIds);
  if (selection.isErr()) return err(selection.error);
  const selected = selection.value;
  const sources = collectDefinitionSources(selected);
  if (sources.isErr()) return err(sources.error);
  const sourcePaths = sources.value;
  const assetPaths = [...new Set([...selected.customObjects.flatMap(definitionAssetPaths), ...(definitionIds ? [] : Object.keys(state.assets))])];
  const missingSource = sourcePaths.find((path) => !state.sourceFiles[path]);
  if (missingSource) return err(`Definition source is missing: ${missingSource}`);
  const missingAsset = assetPaths.find((path) => !state.assets[path]);
  if (missingAsset) return err(`Definition asset is missing: ${missingAsset}`);

  const manifest: z.infer<typeof definitionBundleManifestSchema> = {
    schemaVersion: 1,
    gameId: state.context.gameId,
    definitions: [...selected.customObjects],
    sourcePaths: [...new Set(sourcePaths)].sort(),
    assetPaths: [...new Set(assetPaths)].sort(),
  };
  const files: Record<string, Uint8Array> = {
    ...authoringArchiveFiles(selectAuthoringAssets(authoringAssets, selected, definitionIds !== undefined)),
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
  };
  for (const path of manifest.sourcePaths) files[path] = strToU8(state.sourceFiles[path]?.content ?? "");
  for (const path of manifest.assetPaths) files[path] = state.assets[path]?.bytes ?? new Uint8Array();
  return Result.fromThrowable(() => zipSync(files, { level: 6 }), () => "Failed to build definition bundle")();
}

export interface ScriptDefinitionExportOptions extends ScriptAuthoringExportOptions { readonly definitionIds?: readonly string[] }

function selectDefinitionBundleState(state: ScriptWorkspaceState, definitionIds: readonly string[] | undefined): Result<ScriptWorkspaceState, string> {
  if (definitionIds === undefined) return ok(state);
  if (!definitionIds.length) return err("Select at least one object to export.");
  const ids = new Set(definitionIds);
  const missing = definitionIds.find((id) => !state.customObjects.some((object) => object.id === id));
  if (missing) return err(`Object no longer exists: ${missing}`);
  return ok({ ...state, customObjects: state.customObjects.filter((object) => ids.has(object.id)) });
}

function selectAuthoringAssets(attachment: PortableAssets | null, state: ScriptWorkspaceState, selected: boolean): PortableAssets | null {
  if (!attachment || !selected) return attachment;
  const ids = new Set(state.customObjects.flatMap((object) => object.assetId ? [object.assetId] : []));
  const assets = attachment.assets.filter((asset) => ids.has(asset.id));
  const files = attachment.files.filter((file) => assets.some((asset) => asset.outputs.files.includes(file.path) || file.path.startsWith(`AuthoringSources/${asset.id}/`)));
  return assets.length ? { ...attachment, assets, files } : null;
}

export async function buildScriptDefinitionBundleAsync(state: ScriptWorkspaceState, options: ScriptDefinitionExportOptions = {}) {
  const selection = selectDefinitionBundleState(state, options.definitionIds);
  if (selection.isErr()) return err(selection.error);
  const resolved = await resolveDesktopProjectAssets(selection.value);
  if (resolved.isErr()) return err(resolved.error);
  const attachment = await collectScriptAuthoringAssets(resolved.value, options);
  return attachment.isErr() ? err(attachment.error) : buildScriptDefinitionBundle(resolved.value, attachment.value, options.definitionIds);
}

export function importScriptDefinitionBundle(
  bytes: Uint8Array,
  context: ScriptWorkspaceContext,
): Result<ScriptDefinitionBundle, string> {
  let total = 0, count = 0, rejected = false;
  const unzipResult = Result.fromThrowable(() => unzipSync(bytes, { filter: (entry) => {
    total += entry.originalSize; count++;
    if (entry.originalSize > 128 * 1024 * 1024 || total > 576 * 1024 * 1024 || count > 12288) rejected = true;
    return !rejected;
  } }), () => "Failed to read definition bundle")();
  if (unzipResult.isErr()) return err(unzipResult.error);
  if (rejected) return err("Definition bundle exceeds safe extraction limits.");
  const files = unzipResult.value;
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) return err("Definition bundle is missing manifest.json");
  const jsonResult = Result.fromThrowable(() => JSON.parse(strFromU8(manifestBytes)), () => "Failed to parse definition bundle manifest")();
  if (jsonResult.isErr()) return err(jsonResult.error);
  const manifest = definitionBundleManifestSchema.safeParse(jsonResult.value);
  if (!manifest.success) return err(`Invalid definition bundle manifest: ${manifest.error.message}`);
  if (manifest.data.gameId !== context.gameId) return err(`Definition bundle targets ${manifest.data.gameId}, not ${context.gameId}`);
  for (const definition of manifest.data.definitions) {
    if (!manifest.data.sourcePaths.includes(definition.sourceFilePath)) return err(`Definition source is missing: ${definition.sourceFilePath}`);
    for (const path of definitionAssetPaths(definition)) {
      if (!manifest.data.assetPaths.includes(path)) return err(`Definition asset is missing: ${path}`);
    }
  }

  const sources: Record<string, string> = {};
  for (const path of manifest.data.sourcePaths) {
    const source = files[path];
    if (!source) return err(`Definition bundle is missing source: ${path}`);
    sources[path] = strFromU8(source);
  }
  const assets: Record<string, Uint8Array> = {};
  const dependencies = collectSourceDependencies(sources, manifest.data.sourcePaths);
  if (dependencies.isErr()) return err(dependencies.error);
  for (const path of manifest.data.assetPaths) {
    const asset = files[path];
    if (!asset) return err(`Definition bundle is missing asset: ${path}`);
    assets[path] = asset;
  }
  const authoring = readAuthoringArchiveFiles(files);
  if (authoring.isErr()) return err(authoring.error);
  return ok({ gameId: manifest.data.gameId, definitions: manifest.data.definitions, sources, assets, authoringAssets: authoring.value });
}
