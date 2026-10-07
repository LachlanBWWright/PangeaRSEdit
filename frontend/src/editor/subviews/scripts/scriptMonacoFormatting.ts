import * as monaco from "monaco-editor";
import { z } from "zod";
import { scriptLspClient } from "./scriptLspClient";
import { scriptTextEditSchema } from "./scriptWorkspaceEdits";
import type { ScriptModelWorkspace } from "./scriptMonacoRequests";

export function registerScriptFormatting(readWorkspace: ScriptModelWorkspace): monaco.IDisposable {
  return monaco.languages.registerDocumentFormattingEditProvider("lua", {
    async provideDocumentFormattingEdits(model, options, token) {
      const state = readWorkspace(model);
      if (!state || !scriptLspClient.isWorkspaceConnected(state.context.gameId) || !scriptLspClient.getCapabilities().formatting) return [];
      const version = model.getVersionId();
      const result = await scriptLspClient.request("textDocument/formatting", {
        textDocument: { uri: scriptLspClient.documentUri(model) },
        options: { tabSize: options.tabSize, insertSpaces: options.insertSpaces },
      });
      if (result.isErr() || token.isCancellationRequested || model.isDisposed() || model.getVersionId() !== version) return [];
      const parsed = z.array(scriptTextEditSchema).safeParse(result.value ?? []);
      if (!parsed.success) return [];
      return parsed.data.map((edit) => ({
        range: {
          startLineNumber: edit.range.start.line + 1, startColumn: edit.range.start.character + 1,
          endLineNumber: edit.range.end.line + 1, endColumn: edit.range.end.character + 1,
        }, text: edit.newText,
      }));
    },
  });
}
