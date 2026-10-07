import type * as monaco from "monaco-editor";
import type { Result } from "neverthrow";
import { scriptLspClient, type LspClientError } from "./scriptLspClient";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export type ScriptModelWorkspace = (model: monaco.editor.ITextModel) => ScriptWorkspaceState | null;

export async function requestCurrentScriptFeature(model: Pick<monaco.editor.ITextModel, "isDisposed" | "getVersionId">, token: monaco.CancellationToken, gameId: string, method: string, params: unknown): Promise<Result<unknown, LspClientError> | null> {
  if (token.isCancellationRequested || model.isDisposed() || !scriptLspClient.isWorkspaceConnected(gameId)) return null;
  const version = model.getVersionId();
  const result = await scriptLspClient.request(method, params, 1500);
  if (token.isCancellationRequested || model.isDisposed() || model.getVersionId() !== version || !scriptLspClient.isWorkspaceConnected(gameId)) return null;
  return result;
}

export function scriptFeaturePosition(model: monaco.editor.ITextModel, position: monaco.Position): {
  textDocument: { uri: string }; position: { line: number; character: number };
} {
  return { textDocument: { uri: scriptLspClient.documentUri(model) }, position: { line: position.lineNumber - 1, character: position.column - 1 } };
}
