import * as monaco from "monaco-editor";
import { z } from "zod";
import { scriptLspClient } from "./scriptLspClient";
import { scriptEditorPath } from "./scriptEditorUris";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { lspDefinitionResultSchema, lspDocumentSymbolSchema, lspLocationSchema } from "./scriptLspSchemas";
import { mapLspDefinition, mapLspDocumentSymbol, mapLspLocation } from "./scriptMonacoLspMapping";
import { requestCurrentScriptFeature, scriptFeaturePosition, type ScriptModelWorkspace } from "./scriptMonacoRequests";

function prepareWorkspaceTarget(state: ScriptWorkspaceState, uri: monaco.Uri): boolean {
  const path = scriptEditorPath(uri.toString(), state.context.gameId);
  if (!path) return false;
  const file = state.sourceFiles[path] ?? state.compiledFiles[path];
  if (!file) return false;
  if (!monaco.editor.getModel(uri)) monaco.editor.createModel(file.content, "lua", uri);
  return true;
}

export function registerScriptNavigation(readWorkspace: ScriptModelWorkspace): readonly monaco.IDisposable[] {
  const definitions = monaco.languages.registerDefinitionProvider("lua", {
    async provideDefinition(model, position, token) {
      const state = readWorkspace(model);
      if (!state) return null;
      const result = await requestCurrentScriptFeature(model, token, state.context.gameId, "textDocument/definition", scriptFeaturePosition(model, position));
      if (!result?.isOk()) return null;
      const parsed = lspDefinitionResultSchema.safeParse(result.value);
      if (!parsed.success) return null;
      return mapLspDefinition(parsed.data, (uri) => scriptLspClient.clientUri(uri)).filter((location) => prepareWorkspaceTarget(state, location.uri));
    },
  });
  const references = monaco.languages.registerReferenceProvider("lua", {
    async provideReferences(model, position, context, token) {
      const state = readWorkspace(model);
      if (!state) return null;
      const result = await requestCurrentScriptFeature(model, token, state.context.gameId, "textDocument/references", { ...scriptFeaturePosition(model, position), context });
      if (!result?.isOk()) return null;
      const parsed = z.array(lspLocationSchema).safeParse(result.value);
      if (!parsed.success) return null;
      return parsed.data.map((location) => mapLspLocation(location, (uri) => scriptLspClient.clientUri(uri))).filter((location) => prepareWorkspaceTarget(state, location.uri));
    },
  });
  const symbols = monaco.languages.registerDocumentSymbolProvider("lua", {
    async provideDocumentSymbols(model, token) {
      const state = readWorkspace(model);
      if (!state) return null;
      const result = await requestCurrentScriptFeature(model, token, state.context.gameId, "textDocument/documentSymbol", { textDocument: { uri: scriptLspClient.documentUri(model) } });
      if (!result?.isOk()) return null;
      const parsed = z.array(lspDocumentSymbolSchema).safeParse(result.value);
      return parsed.success ? parsed.data.map(mapLspDocumentSymbol) : null;
    },
  });
  return [definitions, references, symbols];
}
