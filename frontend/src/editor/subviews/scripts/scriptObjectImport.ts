import { err, ok, type Result } from "neverthrow";
import type { ScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { collectSourceDependencies, definitionAssetPaths } from "./scriptDefinitionDependencies";
import { aliasSourceExport } from "./scriptObjectDuplication";
import { mergeDefinitionBundle } from "./scriptObjectActions";
import { sameScriptAuthoringAssets } from "./scriptAuthoringAttachments";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";
import { remapPortableAssets, type PortableAssets, type ProjectAsset } from "@pangea/desktop-contracts";

export type ObjectImportMode = "keep" | "replace" | "copy";
export interface ObjectImportConflict { readonly kind: "Object" | "Source" | "Asset" | "Editable asset"; readonly path: string }
export interface ObjectImportUndo { readonly before: ScriptWorkspaceState; readonly after: ScriptWorkspaceState }
export interface ObjectImportResult { readonly state: ScriptWorkspaceState; readonly selectedId: string | null; readonly undo: ObjectImportUndo; readonly attachment: PortableAssets | null }

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

export function objectImportConflicts(state: ScriptWorkspaceState, bundle: ScriptDefinitionBundle, projectAssets: readonly ProjectAsset[] = []): readonly ObjectImportConflict[] {
  return [
    ...bundle.definitions.filter((incoming) => state.customObjects.some((current) => current.id === incoming.id || current.exportName === incoming.exportName))
      .map((object): ObjectImportConflict => ({ kind: "Object", path: object.id })),
    ...Object.entries(bundle.sources).filter(([path, source]) => state.sourceFiles[path] && state.sourceFiles[path]?.content !== source)
      .map(([path]): ObjectImportConflict => ({ kind: "Source", path })),
    ...Object.entries(bundle.assets).filter(([path, bytes]) => { const current = state.assets[path]; return current && !sameBytes(current.bytes, bytes); })
      .map(([path]): ObjectImportConflict => ({ kind: "Asset", path })),
    ...(bundle.authoringAssets?.assets ?? []).filter((asset) => [...projectAssets, ...(state.authoringAssets?.assets ?? [])].some((current) => current.id === asset.id))
      .map((asset): ObjectImportConflict => ({ kind: "Editable asset", path: asset.name })),
  ];
}

function freshName(base: string, occupied: ReadonlySet<string>): string {
  let index = 1;
  let candidate = `${base}_copy`;
  while (occupied.has(candidate)) candidate = `${base}_copy_${++index}`;
  return candidate;
}

function copyVisualAssets(definition: ScriptCustomObjectDefinition, id: string, assets: Record<string, Uint8Array>, occupied: Set<string>, assetId?: string): ScriptCustomObjectDefinition["visual"] {
  const visual = definition.visual;
  if (visual.kind !== "customDisplayGroup" && visual.kind !== "customSkeleton") return visual;
  const copyPath = (path: string): string => {
    if (assetId && definition.assetId) {
      const prefix = `Data/Scripts/assets/project/${definition.assetId}/`;
      if (path.startsWith(prefix)) {
        const destination = `Data/Scripts/assets/project/${assetId}/${path.slice(prefix.length)}`;
        const bytes = assets[path];
        if (bytes) assets[destination] = bytes.slice();
        occupied.add(destination);
        return destination;
      }
    }
    const marker = path.lastIndexOf("/");
    const directory = `${path.slice(0, marker)}/import_${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    let destination = `${directory}/${path.slice(marker + 1)}`;
    let index = 1;
    while (occupied.has(destination)) destination = `${directory}_${index++}/${path.slice(marker + 1)}`;
    occupied.add(destination);
    const bytes = assets[path];
    if (bytes) assets[destination] = bytes.slice();
    return destination;
  };
  const modelPath = copyPath(visual.modelPath);
  if (visual.kind === "customDisplayGroup") return { ...visual, modelPath };
  const skeletonResource = copyPath(`${visual.skeletonPath}.rsrc`);
  return { ...visual, modelPath, skeletonPath: skeletonResource.slice(0, -5) };
}

function copyBundle(state: ScriptWorkspaceState, bundle: ScriptDefinitionBundle): Result<ScriptDefinitionBundle, string> {
  const definitions: ScriptCustomObjectDefinition[] = [];
  const sources: Record<string, string> = { ...bundle.sources };
  const assets: Record<string, Uint8Array> = { ...bundle.assets };
  const assetPaths = new Set([...Object.keys(state.assets), ...Object.keys(bundle.assets)]);
  const ids = new Set([...state.customObjects, ...bundle.definitions].map((object) => object.id));
  const exports = new Set([...state.customObjects, ...bundle.definitions].map((object) => object.exportName));
  const paths = new Set([...Object.keys(state.sourceFiles), ...Object.keys(bundle.sources)]);
  const assetIds = new Map((bundle.authoringAssets?.assets ?? []).map((asset) => [asset.id, crypto.randomUUID()]));
  for (const incoming of bundle.definitions) {
    const source = bundle.sources[incoming.sourceFilePath];
    if (source === undefined) return err(`Missing source: ${incoming.sourceFilePath}`);
    const id = freshName(incoming.id, ids); ids.add(id);
    const exportName = freshName(incoming.exportName.replace(/[^a-zA-Z0-9_]/g, "_"), exports); exports.add(exportName);
    const stem = `Data/Scripts/src/objects/${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    let path = `${stem}.lua`;
    let suffix = 1;
    while (paths.has(path)) path = `${stem}_${suffix++}.lua`;
    paths.add(path);
    sources[path] = aliasSourceExport(source, incoming.exportName, exportName);
    const assetId = incoming.assetId ? assetIds.get(incoming.assetId) : undefined;
    definitions.push({ ...incoming, assetId, assetAnimations: assetId ? incoming.assetAnimations : undefined, id, exportName, sourceFilePath: path, label: `${incoming.label} (copy)`, visual: copyVisualAssets(incoming, id, assets, assetPaths, assetId) });
  }
  const needed = collectSourceDependencies(sources, definitions.map((object) => object.sourceFilePath));
  if (needed.isErr()) return err(needed.error);
  const retained = Object.fromEntries(needed.value.map((path) => [path, sources[path] ?? ""]));
  const conflictingHelper = Object.entries(retained).find(([path, source]) => state.sourceFiles[path] && state.sourceFiles[path]?.content !== source);
  if (conflictingHelper) return err(`Shared helper differs: ${conflictingHelper[0]}. Rename that helper and its require/dependency references in the source project before importing a copy, or choose Replace.`);
  const conflictingAsset = Object.entries(bundle.assets).find(([path, bytes]) => { const current = state.assets[path]; return current && !sameBytes(current.bytes, bytes); });
  if (conflictingAsset) return err(`Shared runtime asset differs: ${conflictingAsset[0]}. Rename the asset and its Lua references in the source project before importing a copy, or choose Replace.`);
  return ok({ ...bundle, definitions, sources: retained, assets, authoringAssets: bundle.authoringAssets ? remapPortableAssets(bundle.authoringAssets, assetIds) : null });
}

function selectedAttachment(bundle: ScriptDefinitionBundle, definitions: readonly ScriptCustomObjectDefinition[]): PortableAssets | null {
  if (!bundle.authoringAssets) return null;
  const ids = new Set(definitions.flatMap((definition) => definition.assetId ? [definition.assetId] : []));
  const assets = bundle.authoringAssets.assets.filter((asset) => ids.has(asset.id));
  const files = bundle.authoringAssets.files.filter((file) => assets.some((asset) => asset.outputs.files.includes(file.path) || file.path.startsWith(`AuthoringSources/${asset.id}/`)));
  return assets.length ? { ...bundle.authoringAssets, assets, files } : null;
}

function mergeAttachments(current: PortableAssets | null | undefined, incoming: PortableAssets | null): PortableAssets | null {
  if (!incoming) return current ?? null;
  if (!current) return incoming;
  const ids = new Set(incoming.assets.map((asset) => asset.id));
  const replacedFiles = new Set(current.assets.filter((asset) => ids.has(asset.id)).flatMap((asset) => asset.outputs.files));
  return { version: 1, assets: [...current.assets.filter((asset) => !ids.has(asset.id)), ...incoming.assets],
    files: [...current.files.filter((file) => !replacedFiles.has(file.path) && ![...ids].some((id) => file.path.startsWith(`AuthoringSources/${id}/`))), ...incoming.files],
    warnings: [...new Set([...current.warnings, ...incoming.warnings])] };
}

function validateAttachmentRuntime(bundle: ScriptDefinitionBundle, definitions: readonly ScriptCustomObjectDefinition[], attachment: PortableAssets | null): Result<void, string> {
  for (const definition of definitions) {
    const asset = attachment?.assets.find((candidate) => candidate.id === definition.assetId);
    const visual = definition.visual;
    if (!asset || (visual.kind !== "customDisplayGroup" && visual.kind !== "customSkeleton")) continue;
    const pairs = [[visual.modelPath, asset.outputs.model]];
    if (visual.kind === "customSkeleton") {
      if (!asset.outputs.skeleton) return err(`${definition.label}: editable asset is missing its skeleton output.`);
      pairs.push([`${visual.skeletonPath}.rsrc`, asset.outputs.skeleton]);
    }
    for (const [runtimePath, outputPath] of pairs) {
      if (!runtimePath || !outputPath) continue;
      const runtime = bundle.assets[runtimePath];
      const output = attachment?.files.find((file) => file.path === outputPath)?.bytes;
      if (!runtime || !output || !sameBytes(runtime, output)) return err(`${definition.label}: editable output does not match included runtime asset ${runtimePath}. Re-export this object from its source project.`);
    }
  }
  return ok(undefined);
}

export function applyObjectImport(state: ScriptWorkspaceState, bundle: ScriptDefinitionBundle, mode: ObjectImportMode, projectAssets: readonly ProjectAsset[] = []): Result<ObjectImportResult, string> {
  if (bundle.gameId !== state.context.gameId) return err("The active game changed. Import into the bundle's target game.");
  const copied = mode === "copy" ? copyBundle(state, bundle) : ok(bundle);
  if (copied.isErr()) return err(copied.error);
  const incoming = copied.value;
  const definitions = incoming.definitions.filter((object) => mode !== "keep" || !state.customObjects.some((existing) => existing.id === object.id || existing.exportName === object.exportName));
  const attachment = selectedAttachment(incoming, definitions);
  const validation = validateAttachmentRuntime(incoming, definitions, attachment);
  if (validation.isErr()) return err(validation.error);
  if (mode === "keep") {
    const conflict = attachment?.assets.find((asset) => [...projectAssets, ...(state.authoringAssets?.assets ?? [])].some((existing) => existing.id === asset.id && JSON.stringify(existing) !== JSON.stringify(asset)));
    if (conflict) return err(`Editable asset ${conflict.name} differs from the existing project record. Choose Replace or Import as copy.`);
  }
  const linkedIds = new Set(attachment?.assets.map((asset) => asset.id));
  const restoredDefinitions = definitions.map((definition) => definition.assetId && !linkedIds.has(definition.assetId)
    ? { ...definition, assetId: undefined, assetAnimations: undefined } : definition);
  const dependencies = collectSourceDependencies(incoming.sources, definitions.map((object) => object.sourceFilePath));
  if (dependencies.isErr()) return err(dependencies.error);
  const sources = Object.fromEntries(dependencies.value.map((path) => [path, incoming.sources[path] ?? ""]));
  const assets = mode === "keep" ? Object.fromEntries(Object.entries(incoming.assets).filter(([path]) => !state.assets[path])) : incoming.assets;
  if (mode === "keep") {
    const conflict = Object.entries(sources).find(([path, source]) => state.sourceFiles[path] && state.sourceFiles[path]?.content !== source);
    if (conflict) return err(`Keeping ${conflict[0]} would change the imported object's behavior. Choose Replace or resolve the helper conflict first.`);
    for (const definition of definitions) for (const path of definitionAssetPaths(definition)) {
      const current = state.assets[path]; const imported = incoming.assets[path];
      if (current && imported && !sameBytes(current.bytes, imported)) return err(`Keeping ${path} would change the imported object's appearance. Resolve this asset conflict first.`);
    }
  }
  const exportConflict = definitions.find((object) => state.customObjects.some((existing) => existing.id !== object.id && existing.exportName === object.exportName));
  if (exportConflict) return err(`Export name ${exportConflict.exportName} belongs to another object. Choose Import as copy.`);
  const merged = mergeDefinitionBundle(state, { ...incoming, definitions: restoredDefinitions, sources, assets });
  const after = { ...merged, activeFilePath: state.activeFilePath, authoringAssets: mergeAttachments(state.authoringAssets, attachment) };
  if (Object.values(after.assets).reduce((size, asset) => size + asset.bytes.byteLength, 0) > 64 * 1024 * 1024) return err("The imported assets would exceed the 64 MiB package budget.");
  return ok({ state: after, selectedId: definitions[0]?.id ?? null, undo: { before: state, after }, attachment });
}

function importUndoSources(workspace: ScriptWorkspaceState) {
  return Object.entries(workspace.sourceFiles).filter(([, source]) => source.role !== "generated-entry").sort(([left], [right]) => left.localeCompare(right));
}

function importUndoModuleOrder(workspace: ScriptWorkspaceState) {
  return workspace.moduleOrder.filter((path) => workspace.sourceFiles[path]?.role !== "generated-entry");
}

function sameImportAssets(left: ScriptWorkspaceState, right: ScriptWorkspaceState): boolean {
  const assetPaths = Object.keys(left.assets).sort();
  return JSON.stringify(assetPaths) === JSON.stringify(Object.keys(right.assets).sort()) && assetPaths.every((path) => {
    const current = left.assets[path];
    const previous = right.assets[path];
    return current && previous && current.path === previous.path && current.sourceName === previous.sourceName && sameBytes(current.bytes, previous.bytes);
  });
}

export function undoObjectImport(state: ScriptWorkspaceState, undo: ObjectImportUndo): Result<ScriptWorkspaceState, string> {
  if (JSON.stringify(state.customObjects) !== JSON.stringify(undo.after.customObjects)
    || JSON.stringify(importUndoSources(state)) !== JSON.stringify(importUndoSources(undo.after)) || !sameImportAssets(state, undo.after)
    || JSON.stringify(importUndoModuleOrder(state)) !== JSON.stringify(importUndoModuleOrder(undo.after))
    || !sameScriptAuthoringAssets(state.authoringAssets, undo.after.authoringAssets)) return err("Object definitions, sources, module order or assets changed since import. Undo is unavailable to protect those edits.");
  return ok({ ...state, customObjects: undo.before.customObjects, sourceFiles: undo.before.sourceFiles, assets: undo.before.assets, moduleOrder: undo.before.moduleOrder, authoringAssets: undo.before.authoringAssets });
}
