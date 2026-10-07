import type { ScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { addScriptAsset, upsertScriptSourceFile, type ScriptWorkspaceState } from "./scriptWorkspaceState";

export function buildIncomingObjectBundle(current: ScriptWorkspaceState, bundle: ScriptDefinitionBundle): ScriptWorkspaceState {
  let incoming: ScriptWorkspaceState = {
    ...current, customObjects: bundle.definitions, sourceFiles: {}, compiledFiles: {}, assets: {},
    levels: {}, params: [], behaviorCatalog: [], moduleOrder: [], diagnostics: [], statusLog: [], sampleId: null,
  };
  for (const [path, content] of Object.entries(bundle.sources)) incoming = upsertScriptSourceFile(incoming, path, content, "user");
  for (const [path, bytes] of Object.entries(bundle.assets)) incoming = addScriptAsset(incoming, path, bytes, path.split("/").at(-1) ?? path);
  return incoming;
}
