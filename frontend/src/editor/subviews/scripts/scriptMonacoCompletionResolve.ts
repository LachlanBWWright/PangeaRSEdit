import type * as monaco from "monaco-editor";
import { scriptLspClient } from "./scriptLspClient";
import { lspCompletionItemSchema, type LspCompletionItem } from "./scriptLspSchemas";
import { mapLspCompletionItem } from "./scriptMonacoLspMapping";
import { requestCurrentScriptFeature } from "./scriptMonacoRequests";
import { completionEditsFitModel } from "./scriptCompletionModelRanges";

export interface ScriptCompletionResolveContext {
  readonly model: monaco.editor.ITextModel;
  readonly version: number;
  readonly gameId: string;
  readonly position: monaco.Position;
  readonly fallbackRange: monaco.IRange;
  readonly item: LspCompletionItem;
}

export async function resolveScriptCompletion(item: monaco.languages.CompletionItem, context: ScriptCompletionResolveContext | undefined, token: monaco.CancellationToken): Promise<monaco.languages.CompletionItem> {
  if (!context || context.model.isDisposed() || context.model.getVersionId() !== context.version || !scriptLspClient.getCapabilities().completionResolve) return item;
  const result = await requestCurrentScriptFeature(context.model, token, context.gameId, "completionItem/resolve", context.item);
  if (!result?.isOk()) return item;
  const parsed = lspCompletionItemSchema.safeParse(result.value);
  if (!parsed.success) return item;
  const mapped = mapLspCompletionItem({ ...context.item, ...parsed.data }, context.fallbackRange, undefined, context.position);
  return mapped.isOk() && completionEditsFitModel(context.model, mapped.value) ? { ...item, ...mapped.value } : item;
}
