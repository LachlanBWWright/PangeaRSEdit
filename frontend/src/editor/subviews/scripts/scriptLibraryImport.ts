import { err, ok, type Result } from "neverthrow";
import type { ScriptLibrary } from "./scriptLibrary";
import { mergeScriptLibrary } from "./scriptLibraryMerge";
import { restoreScriptAuthoringAssets, selectedScriptAuthoringAssets } from "./scriptAuthoringAttachments";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export interface ScriptImportTarget {
  readonly workspace: ScriptWorkspaceState;
  readonly projectFolder: string | null;
}

function selectedContent(state: ScriptWorkspaceState, key: string): string | undefined {
  const separator = key.indexOf(":");
  const kind = key.slice(0, separator);
  const id = key.slice(separator + 1);
  switch (kind) {
    case "source": return JSON.stringify(state.sourceFiles[id]);
    case "asset": return JSON.stringify(state.assets[id]);
    case "object": return JSON.stringify(state.customObjects.find((entry) => entry.id === id));
    case "behavior": return JSON.stringify(state.behaviorCatalog.find((entry) => entry.id === id));
    case "parameter": return JSON.stringify(state.params.find((entry) => entry.id === id));
    default: return undefined;
  }
}

export function validateScriptImportTarget(before: ScriptImportTarget, current: ScriptImportTarget,
  library: ScriptLibrary, accepted: ReadonlySet<string>): Result<void, string> {
  if (before.projectFolder !== current.projectFolder || before.workspace.context.gameId !== current.workspace.context.gameId
    || before.workspace.context.levelKey !== current.workspace.context.levelKey)
    return err("The active project or level changed. Review the import again in its intended workspace.");
  if (library.manifest.gameId !== current.workspace.context.gameId)
    return err("The active game changed. Import this library into its target game.");
  if ([...accepted].some((key) => selectedContent(before.workspace, key) !== selectedContent(current.workspace, key)))
    return err("Selected content changed while restoring assets. Review the latest changes before applying again.");
  return ok(undefined);
}

export async function prepareScriptLibraryImport(before: ScriptImportTarget, library: ScriptLibrary,
  accepted: ReadonlySet<string>, readCurrent: () => ScriptImportTarget,
  restore = restoreScriptAuthoringAssets): Promise<Result<void, string>> {
  const valid = validateScriptImportTarget(before, readCurrent(), library, accepted);
  if (valid.isErr()) return valid;
  const merged = mergeScriptLibrary(before.workspace, library, accepted);
  if (merged.isErr()) return err(merged.error);
  const restored = await restore(selectedScriptAuthoringAssets(library, accepted));
  if (restored.isErr()) return restored;
  return validateScriptImportTarget(before, readCurrent(), library, accepted);
}
