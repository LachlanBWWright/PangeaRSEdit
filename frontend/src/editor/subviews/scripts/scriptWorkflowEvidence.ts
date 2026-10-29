import { atom } from "jotai";
import type { ScriptAssetFile, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export interface ScriptWorkflowEvidence {
  validatedRevision: string | null;
  launchedRevision: string | null;
}

export const EMPTY_SCRIPT_EVIDENCE: ScriptWorkflowEvidence = { validatedRevision: null, launchedRevision: null };
export const scriptWorkflowEvidenceAtom = atom<Readonly<Record<string, ScriptWorkflowEvidence>>>({});
const revisionCache = new WeakMap<ScriptWorkspaceState, string>();
const assetCache = new WeakMap<ScriptAssetFile, string>();

function getAssetRevision(asset: ScriptAssetFile): string {
  const cached = assetCache.get(asset);
  if (cached) return cached;
  let first = 2166136261;
  let second = 5381;
  for (const byte of asset.bytes) {
    first = Math.imul(first ^ byte, 16777619);
    second = Math.imul(second, 33) ^ byte;
  }
  const revision = `${asset.bytes.length}:${first >>> 0}:${second >>> 0}`;
  assetCache.set(asset, revision);
  return revision;
}

export function scriptWorkflowEvidenceKey(workspace: ScriptWorkspaceState): string {
  return `${workspace.context.gameId}:${workspace.context.levelKey}`;
}

export function getScriptWorkspaceRevision(workspace: ScriptWorkspaceState): string {
  const cached = revisionCache.get(workspace);
  if (cached) return cached;
  let first = 2166136261;
  let second = 5381;
  const hash = (value: number) => {
    first = Math.imul(first ^ value, 16777619);
    second = Math.imul(second, 33) ^ value;
  };
  const text = JSON.stringify({
    game: workspace.context.gameId, level: workspace.context.levelKey, levelNumber: workspace.context.levelNumber,
    hooks: workspace.context.supportedHooks,
    behaviors: workspace.behaviorCatalog.map((behavior) => ({ id: behavior.id, sourceFilePath: behavior.sourceFilePath, targetKinds: behavior.targetKinds, supportedHooks: behavior.supportedHooks, objectType: behavior.objectType })),
    modules: workspace.moduleOrder.filter((path) => workspace.sourceFiles[path]?.role !== "generated-entry"),
    source: Object.keys(workspace.sourceFiles).sort().filter((path) => workspace.sourceFiles[path]?.role !== "generated-entry").map((path) => [path, workspace.sourceFiles[path]?.content]),
    objects: workspace.customObjects, params: workspace.params,
    levels: Object.keys(workspace.levels).sort().map((key) => [key, workspace.levels[key]]),
    assets: Object.keys(workspace.assets).sort().map((path) => {
      const asset = workspace.assets[path];
      return [path, asset ? getAssetRevision(asset) : null];
    }),
  });
  for (let index = 0; index < text.length; index++) hash(text.charCodeAt(index));
  const revision = `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
  revisionCache.set(workspace, revision);
  return revision;
}
