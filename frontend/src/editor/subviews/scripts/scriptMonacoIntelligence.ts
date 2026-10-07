import * as monaco from "monaco-editor";
import { scriptEditorPath } from "./scriptEditorUris";
import { getOfflineScriptCompletions, getOfflineScriptHover, getOfflineScriptSignature } from "./scriptOfflineIntelligence";
import { buildApiSignature } from "./scriptCompletionText";
import { lspCompletionResultSchema, lspHoverSchema, lspSignatureHelpSchema } from "./scriptLspSchemas";
import { mapLspCompletionResult, mapLspHover, mapLspSignatureHelp } from "./scriptMonacoLspMapping";
import { requestCurrentScriptFeature, scriptFeaturePosition, type ScriptModelWorkspace } from "./scriptMonacoRequests";
import { resolveScriptCompletion, type ScriptCompletionResolveContext } from "./scriptMonacoCompletionResolve";
import { scriptLspClient } from "./scriptLspClient";
import { completionEditsFitModel } from "./scriptCompletionModelRanges";

const completionKinds = {
  function: monaco.languages.CompletionItemKind.Function,
  field: monaco.languages.CompletionItemKind.Field,
  snippet: monaco.languages.CompletionItemKind.Snippet,
  value: monaco.languages.CompletionItemKind.Value,
};

function wordRange(model: monaco.editor.ITextModel, position: monaco.Position): monaco.IRange {
  const word = model.getWordUntilPosition(position);
  return new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
}

function offsetRange(model: monaco.editor.ITextModel, start: number, end: number): monaco.IRange {
  return monaco.Range.fromPositions(model.getPositionAt(start), model.getPositionAt(end));
}

export function registerScriptIntelligence(readWorkspace: ScriptModelWorkspace): readonly monaco.IDisposable[] {
  const completionContexts = new WeakMap<monaco.languages.CompletionItem, ScriptCompletionResolveContext>();
  const completion = monaco.languages.registerCompletionItemProvider("lua", {
    triggerCharacters: [".", '"', "'", "(", "["],
    async provideCompletionItems(model, position, _context, token) {
      const state = readWorkspace(model);
      if (!state || token.isCancellationRequested) return null;
      const version = model.getVersionId();
      const result = await requestCurrentScriptFeature(model, token, state.context.gameId, "textDocument/completion", scriptFeaturePosition(model, position));
      if (token.isCancellationRequested || model.isDisposed() || version !== model.getVersionId()) return null;
      const fallback = getOfflineScriptCompletions(state, model.getValue(), model.getOffsetAt(position), scriptEditorPath(model.uri.toString(), state.context.gameId) ?? "").map((item) => ({
        label: item.label, insertText: item.insertText, kind: completionKinds[item.kind],
        range: offsetRange(model, item.replaceStart, item.replaceEnd),
        detail: item.detail, documentation: item.documentation,
        insertTextRules: item.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
      }));
      if (result?.isOk()) {
        const parsed = lspCompletionResultSchema.safeParse(result.value);
        if (parsed.success) {
          const mapped = mapLspCompletionResult(parsed.data, wordRange(model, position), position);
          if (mapped.isOk()) {
            const suggestions = mapped.value.suggestions.filter((item) => completionEditsFitModel(model, item));
            for (const suggestion of suggestions) completionContexts.set(suggestion, {
              model, version, gameId: state.context.gameId, position, fallbackRange: wordRange(model, position), item: suggestion.lspItem,
            });
            const labels = new Set(suggestions.map((item) => item.lspItem.label));
            return { ...mapped.value, suggestions: [...suggestions, ...fallback.filter((item) => !labels.has(item.label))] };
          }
        }
      }
      return { suggestions: fallback };
    },
    resolveCompletionItem: (item, token) => resolveScriptCompletion(item, completionContexts.get(item), token),
  });
  const signature = monaco.languages.registerSignatureHelpProvider("lua", {
    signatureHelpTriggerCharacters: ["(", ","], signatureHelpRetriggerCharacters: [",", ")"],
    async provideSignatureHelp(model, position, token) {
      const state = readWorkspace(model);
      if (!state || token.isCancellationRequested) return null;
      const version = model.getVersionId();
      const result = scriptLspClient.getCapabilities().signatureHelp
        ? await requestCurrentScriptFeature(model, token, state.context.gameId, "textDocument/signatureHelp", scriptFeaturePosition(model, position))
        : null;
      if (token.isCancellationRequested || model.isDisposed() || version !== model.getVersionId()) return null;
      if (result?.isOk()) {
        const parsed = lspSignatureHelpSchema.safeParse(result.value);
        if (parsed.success && parsed.data.signatures.length > 0) return mapLspSignatureHelp(parsed.data);
      }
      const fallback = getOfflineScriptSignature(state, model.getValue(), model.getOffsetAt(position));
      if (!fallback) return null;
      return { value: { signatures: [{ label: buildApiSignature(fallback.api), documentation: fallback.api.description,
        parameters: fallback.api.parameters.map((parameter) => ({ label: parameter.name, documentation: parameter.description })),
      }], activeSignature: 0, activeParameter: Math.min(fallback.activeParameter, Math.max(0, fallback.api.parameters.length - 1)) }, dispose: () => undefined };
    },
  });
  const hover = monaco.languages.registerHoverProvider("lua", {
    async provideHover(model, position, token) {
      const state = readWorkspace(model);
      if (!state || token.isCancellationRequested) return null;
      const version = model.getVersionId();
      const result = await requestCurrentScriptFeature(model, token, state.context.gameId, "textDocument/hover", scriptFeaturePosition(model, position));
      if (token.isCancellationRequested || model.isDisposed() || version !== model.getVersionId()) return null;
      if (result?.isOk()) {
        const parsed = lspHoverSchema.safeParse(result.value);
        if (parsed.success) {
          const mapped = mapLspHover(parsed.data, wordRange(model, position));
          if (mapped.contents.length > 0) return mapped;
        }
      }
      const fallback = getOfflineScriptHover(state, model.getValue(), model.getOffsetAt(position));
      return fallback ? { range: offsetRange(model, fallback.start, fallback.end), contents: [
        { value: `\`\`\`lua\n${buildApiSignature(fallback.api)}\n\`\`\`` }, { value: fallback.api.description ?? "" },
      ] } : null;
    },
  });
  return [completion, signature, hover];
}
