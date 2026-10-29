import type { LevelProjectInput } from "./projectBuild";
import type { ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceState";

const identities = new WeakMap<object, number>();
let nextIdentity = 0;
function identity(value: object | null): number {
  if (value === null) return 0;
  const existing = identities.get(value);
  if (existing !== undefined) return existing;
  nextIdentity += 1;
  identities.set(value, nextIdentity);
  return nextIdentity;
}
export function assetCaptureKey(token: object | null) { return String(identity(token)); }

export function projectCaptureKey(input: LevelProjectInput | null): string {
  if (!input) return "";
  return JSON.stringify({ game: input.globals.GAME_TYPE, baseLevel: input.baseLevel,
    file: identity(input.mapFile), data: Object.values(input.data).map(identity), images: input.mapImages.map(identity),
    scripts: scriptCaptureKey(input.workspace),
  });
}

export function scriptCaptureKey(workspace: ScriptWorkspaceState): string {
  return JSON.stringify({
    sources: Object.values(workspace.sourceFiles).filter((source) => source.role !== "generated-entry")
      .map((source) => [source.path, source.content]),
    moduleOrder: workspace.moduleOrder, behaviors: workspace.behaviorCatalog, objects: workspace.customObjects,
    params: workspace.params, levels: workspace.levels,
    assets: Object.values(workspace.assets).map((asset) => [asset.path, identity(asset.bytes)]),
  });
}
