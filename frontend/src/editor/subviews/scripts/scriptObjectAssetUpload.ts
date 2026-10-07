import { err, ok, ResultAsync, type Result } from "neverthrow";
import { addScriptAsset, updateCustomObjectDefinition, type ScriptCustomObjectDefinition, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { buildScriptAssetPaths, applyUploadedAssetPath } from "./scriptAssetPaths";
import { convertGltfAsset } from "./scriptAssetConversion";
import { validateUploadedScriptAssetAsync } from "./scriptAssetValidation";

interface PreparedAsset {
  readonly definition: ScriptCustomObjectDefinition;
  readonly assetPath: string;
  readonly sourcePath?: string;
  readonly runtimeBytes: Uint8Array;
  readonly sourceBytes: Uint8Array;
  readonly sourceName: string;
  readonly role: "model" | "skeleton";
  readonly manifestPath: string;
  readonly warnings?: readonly string[];
}

export async function prepareObjectAssetUpload(definition: ScriptCustomObjectDefinition, file: File, role: "model" | "skeleton"): Promise<Result<PreparedAsset, string>> {
  if (file.size > 16 * 1024 * 1024) return err("Custom item assets are limited to 16 MiB each");
  const bytes = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
  if (bytes.isErr()) return err(bytes.error);
  const paths = buildScriptAssetPaths(definition, file.name, role);
  if (!paths) return err("The selected asset type is not valid for this object");
  const sourceBytes = new Uint8Array(bytes.value);
  const conversion = paths.sourcePath ? await convertGltfAsset(file.name, sourceBytes) : null;
  if (conversion?.isErr()) return err(`Could not convert ${file.name}: ${conversion.error}`);
  const runtimeBytes = conversion?.isOk() ? conversion.value.nativeBytes : sourceBytes;
  const validation = await validateUploadedScriptAssetAsync(paths.assetPath, runtimeBytes);
  if (validation.isErr()) return err(`Could not add ${file.name}: ${validation.error}`);
  return ok({ definition, role, manifestPath: paths.manifestPath, assetPath: paths.assetPath, sourcePath: paths.sourcePath, sourceBytes, runtimeBytes, sourceName: file.name, warnings: conversion?.isOk() ? conversion.value.warnings : [] });
}

export function commitPreparedObjectAsset(current: ScriptWorkspaceState, asset: PreparedAsset): Result<ScriptWorkspaceState, string> {
  const definition = current.customObjects.find((item) => item.id === asset.definition.id);
  if (!definition || definition.visual.kind !== asset.definition.visual.kind) return err("The item was removed or its visual type changed while the asset was processing. The upload was not applied.");
  const retained = Object.values(current.assets).filter((file) => file.path !== asset.assetPath && file.path !== asset.sourcePath).reduce((total, file) => total + file.bytes.byteLength, 0);
  const added = asset.runtimeBytes.byteLength + (asset.sourcePath ? asset.sourceBytes.byteLength : 0);
  if (retained + added > 64 * 1024 * 1024) return err("This asset would exceed the script package's 64 MiB asset budget.");
  const next = applyPreparedObjectAsset(current, asset);
  return ok({ ...next, diagnostics: [...next.diagnostics, ...(asset.warnings ?? []).map((message, index) => ({ category: "source-validation", severity: "warning", message, code: `asset.conversion.${index}`, filePath: asset.sourcePath ?? asset.assetPath, line: 0, column: 0 } satisfies import("./scriptWorkspaceStateTypes").ScriptDiagnostic))] });
}

export function applyPreparedObjectAsset(current: ScriptWorkspaceState, asset: PreparedAsset): ScriptWorkspaceState {
  const definition = current.customObjects.find((candidate) => candidate.id === asset.definition.id);
  if (!definition || definition.visual.kind !== asset.definition.visual.kind) return current;
  let next = addScriptAsset(current, asset.assetPath, asset.runtimeBytes, asset.sourceName);
  if (asset.sourcePath) next = addScriptAsset(next, asset.sourcePath, asset.sourceBytes, asset.sourceName);
  return updateCustomObjectDefinition(next, applyUploadedAssetPath(definition, asset.manifestPath, asset.role));
}
