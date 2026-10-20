import { err, ok, type Result } from "neverthrow";
import { addScriptAsset, upsertScriptSourceFile, saveScriptSourceFile, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { ScriptLibrary } from "./scriptLibrary";
import { definitionAssetPaths } from "./scriptDefinitionDependencies";

export interface ScriptImportChange {
  key: string;
  kind: "source" | "object" | "behavior" | "parameter" | "asset";
  label: string;
  before: string | null;
  after: string;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function recordChanges<T extends { id: string }>(kind: ScriptImportChange["kind"], current: readonly T[], incoming: readonly T[]): readonly ScriptImportChange[] {
  return incoming.flatMap((entry) => {
    const previous = current.find((candidate) => candidate.id === entry.id);
    const before = previous ? JSON.stringify(previous, null, 2) : null;
    const after = JSON.stringify(entry, null, 2);
    return before === after ? [] : [{ key: `${kind}:${entry.id}`, kind, label: entry.id, before, after }];
  });
}

export function scriptLibraryChanges(state: ScriptWorkspaceState, library: ScriptLibrary): readonly ScriptImportChange[] {
  return [
    ...Object.entries(library.sources).flatMap(([path, content]) => {
      const existing = state.sourceFiles[path]?.content;
      return existing === content ? [] : [{ key: `source:${path}`, kind: "source", label: path, before: existing ?? null, after: content } satisfies ScriptImportChange];
    }),
    ...recordChanges("object", state.customObjects, library.manifest.objects),
    ...recordChanges("behavior", state.behaviorCatalog, library.manifest.behaviors),
    ...recordChanges("parameter", state.params, library.manifest.params),
    ...Object.entries(library.assets).flatMap(([path, bytes]) => {
      const existing = state.assets[path]?.bytes;
      return existing && bytesEqual(existing, bytes) ? [] : [{ key: `asset:${path}`, kind: "asset", label: path, before: existing ? `${existing.byteLength} bytes` : null, after: `${bytes.byteLength} bytes` } satisfies ScriptImportChange];
    }),
  ];
}

function mergeRecords<T extends { id: string }>(kind: string, current: readonly T[], incoming: readonly T[], accepted: ReadonlySet<string>): readonly T[] {
  const replacements = incoming.filter((entry) => accepted.has(`${kind}:${entry.id}`));
  return [...current.filter((entry) => !replacements.some((replacement) => replacement.id === entry.id)), ...replacements];
}

export function mergeScriptLibrary(state: ScriptWorkspaceState, library: ScriptLibrary, accepted: ReadonlySet<string>): Result<ScriptWorkspaceState, string> {
  if (library.manifest.gameId !== state.context.gameId) return err("The active game changed. Import this library into its target game.");
  let next = {
    ...state,
    customObjects: mergeRecords("object", state.customObjects, library.manifest.objects, accepted),
    behaviorCatalog: mergeRecords("behavior", state.behaviorCatalog, library.manifest.behaviors, accepted),
    params: mergeRecords("parameter", state.params, library.manifest.params, accepted),
  };
  for (const [path, content] of Object.entries(library.sources)) {
    if (accepted.has(`source:${path}`)) next = saveScriptSourceFile(upsertScriptSourceFile(next, path, content), path);
  }
  for (const [path, bytes] of Object.entries(library.assets)) {
    if (accepted.has(`asset:${path}`)) next = addScriptAsset(next, path, bytes, path.split("/").at(-1) ?? path);
  }
  const paths = library.manifest.moduleOrder.filter((path) => next.sourceFiles[path]);
  for (const object of next.customObjects.filter((entry) => accepted.has(`object:${entry.id}`))) {
    if (!next.sourceFiles[object.sourceFilePath]) return err(`Select the source for ${object.label} as well: ${object.sourceFilePath}`);
    for (const path of definitionAssetPaths(object)) {
      if (!next.assets[path]) return err(`Select the asset for ${object.label} as well: ${path}`);
    }
  }
  for (const behavior of next.behaviorCatalog.filter((entry) => accepted.has(`behavior:${entry.id}`))) {
    if (!next.sourceFiles[behavior.sourceFilePath]) return err(`Select the source for ${behavior.label} as well: ${behavior.sourceFilePath}`);
  }
  if (Object.values(next.assets).reduce((size, asset) => size + asset.bytes.byteLength, 0) > 64 * 1024 * 1024) return err("The merged workspace would exceed its 64 MiB asset budget.");
  return ok({ ...next, activeFilePath: state.activeFilePath, moduleOrder: [...new Set([...state.moduleOrder, ...paths, ...next.moduleOrder])], statusLog: [...next.statusLog, "Imported shared content; level assignments and placements preserved."].slice(-20) });
}
