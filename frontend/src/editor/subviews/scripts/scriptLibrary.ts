import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { err, ok, Result } from "neverthrow";
import { z } from "zod";
import { scriptBehaviorDefinitionSchema, scriptCustomObjectDefinitionSchema, scriptParameterDefinitionSchema } from "./scriptWorkspaceStateTypes";
import type { ScriptBehaviorDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";
import { collectScriptSources, collectSourceDependencies, definitionAssetPaths, isDefinitionAssetPath, isDefinitionSourcePath } from "./scriptDefinitionDependencies";
import { buildScriptIdeSupportFiles } from "./scriptIdePackage";
import { buildScriptTypeDeclarationFiles } from "./scriptTypeDeclarations";
import { validateUploadedScriptAssetAsync } from "./scriptAssetValidation";
import type { PortableAssets } from "@pangea/desktop-contracts";
import { authoringArchiveFiles, collectScriptAuthoringAssets, isAuthoringArchivePath, readAuthoringArchiveFiles, type ScriptAuthoringExportOptions } from "./scriptAuthoringAttachments";
import { resolveDesktopProjectAssets } from "@/platform/desktop/projectScriptAssets";

const sourcePath = z.string().refine(isDefinitionSourcePath);
const librarySchema = z.object({
  kind: z.literal("pangea-script-library"), version: z.literal(1), gameId: z.string(),
  objects: z.array(scriptCustomObjectDefinitionSchema), behaviors: z.array(scriptBehaviorDefinitionSchema),
  params: z.array(scriptParameterDefinitionSchema), sources: z.array(sourcePath),
  assets: z.array(z.string().refine(isDefinitionAssetPath)), moduleOrder: z.array(sourcePath),
});

export interface ScriptLibrary {
  manifest: Omit<z.infer<typeof librarySchema>, "behaviors"> & { readonly behaviors: readonly ScriptBehaviorDefinition[] };
  sources: Readonly<Record<string, string>>;
  assets: Readonly<Record<string, Uint8Array>>;
  authoringAssets?: PortableAssets | null;
}

export function buildScriptLibrary(state: ScriptWorkspaceState, authoringAssets: PortableAssets | null = state.authoringAssets ?? null): Result<Uint8Array, string> {
  const catalogSources = new Set(state.behaviorCatalog.map((behavior) => behavior.sourceFilePath));
  const roots = Object.keys(state.sourceFiles).filter((path) => isDefinitionSourcePath(path)
    && !state.sourceFiles[path]?.readOnly
    && (catalogSources.has(path) || !/^Data\/Scripts\/src\/(assignments|bindings)\//.test(path)));
  const closure = collectScriptSources(state, roots);
  if (closure.isErr()) return err(closure.error);
  const paths = [...closure.value];
  const sources = Object.fromEntries(paths.map((path) => [path, state.sourceFiles[path]?.content ?? ""]));
  const manifest: ScriptLibrary["manifest"] = {
    kind: "pangea-script-library", version: 1, gameId: state.context.gameId,
    objects: [...state.customObjects], behaviors: state.behaviorCatalog.filter((behavior) => paths.includes(behavior.sourceFilePath)),
    params: [...state.params], sources: paths.sort(), assets: Object.keys(state.assets).sort(),
    moduleOrder: state.moduleOrder.filter((path) => paths.includes(path)),
  };
  const library = { manifest, sources, assets: Object.fromEntries(Object.entries(state.assets).map(([path, asset]) => [path, asset.bytes])) };
  const valid = validateLibraryReferences(library);
  if (valid.isErr()) return err(valid.error);
  const schema = Result.fromThrowable(() => z.toJSONSchema(librarySchema), () => "Could not generate the library's JSON schema.")();
  if (schema.isErr()) return err(schema.error);
  const files: Record<string, Uint8Array> = {
    ...authoringArchiveFiles(authoringAssets),
    "library.json": strToU8(JSON.stringify({ $schema: "./library.schema.json", ...manifest }, null, 2)),
    "library.schema.json": strToU8(JSON.stringify(schema.value, null, 2)),
  };
  for (const [path, content] of Object.entries(sources)) files[path] = strToU8(content);
  for (const [path, bytes] of Object.entries(library.assets)) files[path] = bytes;
  for (const file of buildScriptIdeSupportFiles(state)) files[file.path] = file.bytes;
  for (const file of buildScriptTypeDeclarationFiles(state)) files[file.path] = strToU8(file.content);
  files["LIBRARY.md"] = strToU8("# Shared level-pack library\n\nEdit Data/Scripts/src in your IDE. Keep library.json at the ZIP root.\nImport this library to merge objects, scripts and assets into the same game.\nLevel assignments, bindings, replacements and placements are excluded.\nImport Lua folder updates source only; use Import shared library for definition/asset changes.\nNew Lua files under src are discovered on import. Edit library.json to define new objects or reusable behavior metadata.\nUnassigned user modules are game-wide; catalog behaviors run when assigned and object sources use lifecycle routing.\nMissing files do not delete existing editor content. Review conflicts before applying.\n");
  return Result.fromThrowable(() => zipSync(files, { level: 6 }), () => "Could not export the shared library.")();
}

export async function buildScriptLibraryAsync(state: ScriptWorkspaceState, options: ScriptAuthoringExportOptions = {}) {
  const resolved = await resolveDesktopProjectAssets(state);
  if (resolved.isErr()) return err(resolved.error);
  const attachment = await collectScriptAuthoringAssets(resolved.value, options);
  return attachment.isErr() ? err(attachment.error) : buildScriptLibrary(resolved.value, attachment.value);
}

function validateLibraryReferences(library: ScriptLibrary): Result<true, string> {
  const dependencies = collectSourceDependencies(library.sources, library.manifest.sources);
  if (dependencies.isErr()) return err(dependencies.error);
  for (const group of [library.manifest.objects, library.manifest.behaviors, library.manifest.params]) {
    const ids = group.map((entry) => entry.id);
    if (new Set(ids).size !== ids.length) return err("Library contains duplicate IDs.");
  }
  for (const entry of [...library.manifest.objects, ...library.manifest.behaviors]) {
    if (!library.manifest.sources.includes(entry.sourceFilePath)) return err(`Library source is missing: ${entry.sourceFilePath}`);
  }
  for (const object of library.manifest.objects) {
    for (const path of definitionAssetPaths(object)) {
      if (!library.manifest.assets.includes(path)) return err(`Library asset is missing: ${path}`);
    }
  }
  if (library.manifest.moduleOrder.some((path) => !library.manifest.sources.includes(path))) return err("Library module order references a missing source.");
  return ok(true);
}

export async function readScriptLibrary(bytes: Uint8Array, gameId: string): Promise<Result<ScriptLibrary, string>> {
  let unpackedSize = 0;
  let exceedsBudget = false;
  const archive = Result.fromThrowable(() => unzipSync(bytes, { filter: (file) => {
    if (file.name !== "library.json" && !isDefinitionSourcePath(file.name) && !isDefinitionAssetPath(file.name) && !isAuthoringArchivePath(file.name)) return false;
    unpackedSize += file.originalSize;
    if (file.originalSize > (isAuthoringArchivePath(file.name) ? 128 : 16) * 1024 * 1024 || unpackedSize > 576 * 1024 * 1024) { exceedsBudget = true; return false; }
    return true;
  } }), () => "Could not read the library ZIP.")();
  if (archive.isErr()) return err(archive.error);
  if (exceedsBudget) return err("Library exceeds its extraction budget: 16 MiB per runtime file, 128 MiB per authoring file, or 576 MiB total.");
  const manifestBytes = archive.value["library.json"];
  if (!manifestBytes) return err("Choose a shared library ZIP containing library.json, rather than a workspace backup or object bundle.");
  const json = Result.fromThrowable((): unknown => JSON.parse(strFromU8(manifestBytes)), () => "Could not parse library.json.")();
  if (json.isErr()) return err(json.error);
  const manifest = librarySchema.safeParse(json.value);
  if (!manifest.success) return err(`Invalid library: ${manifest.error.message}`);
  if (manifest.data.gameId !== gameId) return err(`This library targets ${manifest.data.gameId}; select that game before importing.`);
  const declared = manifest.data;
  const discovered = Object.keys(archive.value).filter((path) => isDefinitionSourcePath(path) && !declared.sources.includes(path));
  const metadata = { ...declared, sources: [...declared.sources, ...discovered], moduleOrder: [...declared.moduleOrder, ...discovered] };
  const sources: Record<string, string> = {};
  const assets: Record<string, Uint8Array> = {};
  let total = 0;
  for (const path of [...metadata.sources, ...metadata.assets]) {
    const file = archive.value[path];
    if (!file) return err(`Library is missing ${path}`);
    total += file.byteLength;
    if (file.byteLength > 16 * 1024 * 1024 || total > 64 * 1024 * 1024) return err("Library exceeds the 16 MiB per-file or 64 MiB total budget.");
    if (metadata.sources.includes(path)) sources[path] = strFromU8(file);
    else {
      const valid = await validateUploadedScriptAssetAsync(path, file);
      if (valid.isErr()) return err(valid.error);
      assets[path] = file;
    }
  }
  const authoring = readAuthoringArchiveFiles(archive.value);
  if (authoring.isErr()) return err(authoring.error);
  const library = { manifest: metadata, sources, assets, authoringAssets: authoring.value };
  return validateLibraryReferences(library).map(() => library);
}
