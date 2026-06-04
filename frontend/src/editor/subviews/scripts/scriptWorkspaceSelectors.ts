import type {
  ScriptBehaviorDefinition,
  ScriptCustomObjectDefinition,
  ScriptHookId,
  ScriptParameterDefinition,
  ScriptTagDefinition,
  ScriptTargetKind,
  ScriptWorkspaceState,
} from "./scriptWorkspaceState";
import { getLevelState } from "./scriptWorkspaceHelpers";

export interface ScriptWorkspaceSummary {
  readonly hasScripts: boolean;
  readonly hasGlobalScripts: boolean;
  readonly hasItemScripts: boolean;
  readonly hasExtendedFeatures: boolean;
  readonly buildErrorCount: number;
  readonly previewReady: boolean;
}

export function summarizeScriptWorkspace(
  state: ScriptWorkspaceState,
): ScriptWorkspaceSummary {
  const levelState = getLevelState(state);
  const buildErrorCount = state.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length;

  const hasItemScripts =
    levelState.terrainBindings.length > 0 ||
    levelState.splineBindings.length > 0 ||
    levelState.mapItemBindings.length > 0;
  const hasGlobalScripts =
    levelState.globalHooks.length > 0 || state.moduleOrder.length > 1;
  const hasExtendedFeatures =
    state.customObjects.length > 0 || levelState.customPlacements.length > 0;
  const hasScripts =
    hasGlobalScripts ||
    hasItemScripts ||
    hasExtendedFeatures ||
    state.sampleId !== null;

  return {
    hasScripts,
    hasGlobalScripts,
    hasItemScripts,
    hasExtendedFeatures,
    buildErrorCount,
    previewReady: buildErrorCount === 0,
  };
}

export function getScriptAllowedTags(
  state: ScriptWorkspaceState,
): readonly ScriptTagDefinition[] {
  const behaviorTags = state.behaviorCatalog.flatMap(
    (behavior) => behavior.contributedTags,
  );
  const tags = [...state.context.allowedTags, ...behaviorTags];
  const unique = new Map<string, ScriptTagDefinition>();
  for (const tag of tags) {
    if (!unique.has(tag.id)) {
      unique.set(tag.id, tag);
    }
  }
  return [...unique.values()];
}

export function getScriptBehaviorOptions(
  state: ScriptWorkspaceState,
  targetKind: ScriptTargetKind,
  hookId?: ScriptHookId,
): readonly ScriptBehaviorDefinition[] {
  return state.behaviorCatalog.filter((behavior) => {
    if (!behavior.targetKinds.includes(targetKind)) {
      return false;
    }
    if (!hookId) {
      return true;
    }
    return behavior.supportedHooks.includes(hookId);
  });
}

export function getScriptSourcePathOptions(
  state: ScriptWorkspaceState,
): readonly string[] {
  const orderedPaths = state.moduleOrder.filter((path) => state.sourceFiles[path]);
  const extraPaths = Object.keys(state.sourceFiles).filter(
    (path) => !orderedPaths.includes(path),
  );
  return [...orderedPaths, ...extraPaths];
}

export function getScriptCustomObjectOptions(
  state: ScriptWorkspaceState,
): readonly ScriptCustomObjectDefinition[] {
  return state.customObjects;
}

export function getScriptParamOptions(
  state: ScriptWorkspaceState,
): readonly ScriptParameterDefinition[] {
  return state.params;
}

export function isSourceFileDirty(
  state: ScriptWorkspaceState,
  path: string,
): boolean {
  const sourceFile = state.sourceFiles[path];
  return sourceFile ? sourceFile.content !== sourceFile.savedContent : false;
}