import { err, ok, ResultAsync, type Result } from "neverthrow";
import { buildGeneratedCustomObjectId } from "./scriptWorkspaceHelpers";
import { buildCustomObjectSourceTemplate, materializeCustomObjectSourceTemplate } from "./scriptCustomObjectTemplate";
import {
  addScriptAsset, createCustomObjectFromBehavior, upsertScriptSourceFile, updateCustomObjectDefinition,
  type ScriptCustomObjectDefinition, type ScriptWorkspaceState,
} from "./scriptWorkspaceState";
import { applyUploadedAssetPath, buildScriptAssetPaths } from "./scriptAssetPaths";
import { convertGltfAsset } from "./scriptAssetConversion";
import { validateUploadedScriptAssetAsync } from "./scriptAssetValidation";
import type { ScriptDefinitionBundle } from "./scriptDefinitionBundle";

export function createObjectDefinition(state: ScriptWorkspaceState, label: string, starter: string): Result<{ state: ScriptWorkspaceState; id: string }, string> {
  const name = label.trim();
  if (!name) return err("Give the object a name.");
  const id = buildGeneratedCustomObjectId(name, state.customObjects.map((object) => object.id));
  if (starter !== "blank") {
    const next = createCustomObjectFromBehavior(state, starter, id, name);
    return next.customObjects.some((object) => object.id === id) ? ok({ state: next, id }) : err("Choose an available starter.");
  }
  const exportName = id.replace(/[^a-zA-Z0-9_]/g, "_");
  const sourceFilePath = `Data/Scripts/src/objects/${id.replaceAll(".", "-")}.lua`;
  const definition: ScriptCustomObjectDefinition = {
    id, label: name, exportName, sourceFilePath, tags: [], description: "Custom scripted object",
    compatibility: "preview-ready", visual: { kind: "none" }, collision: { kind: "none" },
  };
  const content = materializeCustomObjectSourceTemplate(buildCustomObjectSourceTemplate(name), exportName);
  const next = upsertScriptSourceFile(state, sourceFilePath, content, "generated-assignment", id);
  return ok({ state: { ...next, customObjects: [...next.customObjects, definition] }, id });
}

export function getObjectUsage(state: ScriptWorkspaceState, id: string) {
  return Object.entries(state.levels).flatMap(([levelKey, level]) => [
    ...level.customPlacements.filter((entry) => entry.objectId === id).map((entry) => ({ levelKey, label: entry.label, placement: entry })),
    ...[...level.terrainReplacements, ...level.splineReplacements, ...level.mapReplacements]
      .filter((entry) => entry.customObjectId === id).map(() => ({ levelKey, label: "Native item replacement", placement: null })),
  ]);
}

export function deleteObjectDefinition(state: ScriptWorkspaceState, id: string): ScriptWorkspaceState {
  if (getObjectUsage(state, id).length > 0) return state;
  return { ...state, customObjects: state.customObjects.filter((object) => object.id !== id) };
}

export function mergeDefinitionBundle(state: ScriptWorkspaceState, bundle: ScriptDefinitionBundle): ScriptWorkspaceState {
  const ids = new Set(bundle.definitions.map((object) => object.id));
  let next: ScriptWorkspaceState = { ...state, customObjects: [...state.customObjects.filter((object) => !ids.has(object.id)), ...bundle.definitions] };
  for (const [path, source] of Object.entries(bundle.sources)) next = upsertScriptSourceFile(next, path, source);
  for (const [path, bytes] of Object.entries(bundle.assets)) next = addScriptAsset(next, path, bytes, path.split("/").at(-1) ?? path);
  return next;
}

export function getCustomModelFormat(gameId: string): "bg3d" | "3dmf" | "shapes" {
  if (gameId === "MightyMike-Android") return "shapes";
  return gameId === "Bugdom-android" || gameId === "Nanosaur-android" ? "3dmf" : "bg3d";
}

export async function prepareObjectAsset(state: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition, file: File, role: "model" | "skeleton"): Promise<Result<(state: ScriptWorkspaceState) => ScriptWorkspaceState, string>> {
  if (file.size > 16 * 1024 * 1024) return err("Choose an asset smaller than 16 MiB.");
  const format = getCustomModelFormat(state.context.gameId);
  const extension = file.name.toLowerCase().split(".").at(-1);
  const modern = extension === "gltf" || extension === "glb";
  if (role === "model" && extension !== format && !(format === "bg3d" && modern && definition.visual.kind === "customDisplayGroup")) {
    return err(`This game needs .${format} models${format === "bg3d" ? "; glTF/GLB can be converted for display models" : ""}.`);
  }
  const paths = buildScriptAssetPaths(definition, file.name, role);
  if (!paths) return err("Choose a supported model or .rsrc skeleton resource.");
  const read = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
  if (read.isErr()) return err(read.error);
  const sourceBytes = new Uint8Array(read.value);
  const converted = paths.sourcePath ? await convertGltfAsset(file.name, sourceBytes) : null;
  if (converted?.isErr()) return err(converted.error);
  const runtimeBytes = converted?.isOk() ? converted.value.nativeBytes : sourceBytes;
  const validation = await validateUploadedScriptAssetAsync(paths.assetPath, runtimeBytes);
  if (validation.isErr()) return err(validation.error);
  const warnings = converted?.isOk() ? converted.value.warnings : [];
  const initialTotal = Object.values(state.assets).filter((asset) => asset.path !== paths.assetPath && asset.path !== paths.sourcePath)
    .reduce((size, asset) => size + asset.bytes.byteLength, 0) + runtimeBytes.byteLength + (paths.sourcePath ? sourceBytes.byteLength : 0);
  if (initialTotal > 64 * 1024 * 1024) return err("This package would exceed its 64 MiB asset budget. Remove unused assets first.");
  return ok((current) => {
    const currentDefinition = current.customObjects.find((object) => object.id === definition.id);
    if (!currentDefinition || currentDefinition.visual.kind !== definition.visual.kind) return current;
    const total = Object.values(current.assets).filter((asset) => asset.path !== paths.assetPath && asset.path !== paths.sourcePath)
      .reduce((size, asset) => size + asset.bytes.byteLength, 0) + runtimeBytes.byteLength + (paths.sourcePath ? sourceBytes.byteLength : 0);
    if (total > 64 * 1024 * 1024) return current;
    let next = addScriptAsset(current, paths.assetPath, runtimeBytes, file.name);
    if (paths.sourcePath) next = addScriptAsset(next, paths.sourcePath, sourceBytes, file.name);
    next = updateCustomObjectDefinition(next, applyUploadedAssetPath(currentDefinition, paths.manifestPath, role));
    return { ...next, statusLog: [...next.statusLog, ...warnings].slice(-20) };
  });
}
