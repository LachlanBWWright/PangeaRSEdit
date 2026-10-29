import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import type { ScriptWorkspaceState } from "../subviews/scripts/scriptWorkspaceState";

export interface EditorHistoryItem extends AtomicLevelData {
  readonly scripts: ScriptWorkspaceState;
}

export interface EditorHistory {
  readonly items: readonly EditorHistoryItem[];
  readonly index: number;
}

function authoringText(workspace: ScriptWorkspaceState): string {
  return JSON.stringify({
    behaviorCatalog: workspace.behaviorCatalog,
    moduleOrder: workspace.moduleOrder,
    customObjects: workspace.customObjects,
    params: workspace.params,
    levels: workspace.levels,
    sources: Object.values(workspace.sourceFiles)
      .filter((source) => source.role !== "generated-entry")
      .map((source) => ({ path: source.path, content: source.content, role: source.role, ownerId: source.ownerId })),
  });
}

function sameAssets(left: EditorHistoryItem, right: EditorHistoryItem): boolean {
  const leftAssets = Object.entries(left.scripts.assets);
  return left.scripts.authoringAssets === right.scripts.authoringAssets &&
    leftAssets.length === Object.keys(right.scripts.assets).length &&
    leftAssets.every(([path, asset]) => asset === right.scripts.assets[path]);
}

export function sameEditorContent(left: EditorHistoryItem, right: EditorHistoryItem): boolean {
  if (left.headerData !== right.headerData || left.itemData !== right.itemData ||
      left.liquidData !== right.liquidData || left.fenceData !== right.fenceData ||
      left.splineData !== right.splineData || left.terrainData !== right.terrainData) return false;
  return sameAssets(left, right) && authoringText(left.scripts) === authoringText(right.scripts);
}

export function recordEditorHistory(history: EditorHistory, item: EditorHistoryItem): EditorHistory {
  const previous = history.items[history.index];
  // Asset imports have their own disk-aware undo transaction.
  if (previous && !sameAssets(previous, item)) return { items: [item], index: 0 };
  if (previous && sameEditorContent(previous, item)) return history;
  const items = [...history.items.slice(0, history.index + 1), item].slice(-10);
  return { items, index: items.length - 1 };
}

export function moveEditorHistory(history: EditorHistory, direction: -1 | 1): { history: EditorHistory; item: EditorHistoryItem } | null {
  const index = history.index + direction;
  const item = history.items[index];
  return item ? { history: { ...history, index }, item } : null;
}

export function restoreScriptAuthoring(current: ScriptWorkspaceState, previous: ScriptWorkspaceState): ScriptWorkspaceState {
  const sourceFiles = Object.fromEntries(Object.entries(previous.sourceFiles)
    .filter(([, source]) => source.role !== "generated-entry")
    .map(([path, source]) => [path, {
      ...source,
      savedContent: current.sourceFiles[path]?.savedContent ?? source.savedContent,
    }]));
  return {
    ...current,
    activeFilePath: previous.sourceFiles[current.activeFilePath]
      ? current.activeFilePath
      : previous.activeFilePath,
    behaviorCatalog: previous.behaviorCatalog,
    moduleOrder: previous.moduleOrder,
    sourceFiles,
    customObjects: previous.customObjects,
    params: previous.params,
    assets: previous.assets,
    authoringAssets: previous.authoringAssets,
    levels: previous.levels,
    sampleId: previous.sampleId,
  };
}
