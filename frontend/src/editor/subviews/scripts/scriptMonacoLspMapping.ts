import * as monaco from "monaco-editor";
import { err, ok, Result } from "neverthrow";
import type { LspCompletionDefaults, LspCompletionItem, LspCompletionResult, LspDefinitionResult, LspDocumentSymbol, LspLocation } from "./scriptLspSchemas";
export { mapLspHover, mapLspSignatureHelp } from "./scriptMonacoLspDocumentation";
import { mapLspRange } from "./scriptMonacoLspRanges";
import { mapLspDocumentation } from "./scriptMonacoLspDocumentation";
export { mapLspRange } from "./scriptMonacoLspRanges";

export interface ScriptLspCompletion extends monaco.languages.CompletionItem {
  readonly lspItem: LspCompletionItem;
}
export interface ScriptLspCompletionList extends monaco.languages.CompletionList {
  suggestions: ScriptLspCompletion[];
}
const completionKinds: Readonly<Record<number, monaco.languages.CompletionItemKind>> = {
  1: monaco.languages.CompletionItemKind.Text, 2: monaco.languages.CompletionItemKind.Method,
  3: monaco.languages.CompletionItemKind.Function, 4: monaco.languages.CompletionItemKind.Constructor,
  5: monaco.languages.CompletionItemKind.Field, 6: monaco.languages.CompletionItemKind.Variable,
  7: monaco.languages.CompletionItemKind.Class, 8: monaco.languages.CompletionItemKind.Interface,
  9: monaco.languages.CompletionItemKind.Module, 10: monaco.languages.CompletionItemKind.Property,
  11: monaco.languages.CompletionItemKind.Unit, 12: monaco.languages.CompletionItemKind.Value,
  13: monaco.languages.CompletionItemKind.Enum, 14: monaco.languages.CompletionItemKind.Keyword,
  15: monaco.languages.CompletionItemKind.Snippet, 16: monaco.languages.CompletionItemKind.Color,
  17: monaco.languages.CompletionItemKind.File, 18: monaco.languages.CompletionItemKind.Reference,
  19: monaco.languages.CompletionItemKind.Folder, 20: monaco.languages.CompletionItemKind.EnumMember,
  21: monaco.languages.CompletionItemKind.Constant, 22: monaco.languages.CompletionItemKind.Struct,
  23: monaco.languages.CompletionItemKind.Event, 24: monaco.languages.CompletionItemKind.Operator,
  25: monaco.languages.CompletionItemKind.TypeParameter,
};
const symbolKinds: Readonly<Record<number, monaco.languages.SymbolKind>> = {
  1: monaco.languages.SymbolKind.File, 2: monaco.languages.SymbolKind.Module,
  3: monaco.languages.SymbolKind.Namespace, 4: monaco.languages.SymbolKind.Package,
  5: monaco.languages.SymbolKind.Class, 6: monaco.languages.SymbolKind.Method,
  7: monaco.languages.SymbolKind.Property, 8: monaco.languages.SymbolKind.Field,
  9: monaco.languages.SymbolKind.Constructor, 10: monaco.languages.SymbolKind.Enum,
  11: monaco.languages.SymbolKind.Interface, 12: monaco.languages.SymbolKind.Function,
  13: monaco.languages.SymbolKind.Variable, 14: monaco.languages.SymbolKind.Constant,
  15: monaco.languages.SymbolKind.String, 16: monaco.languages.SymbolKind.Number,
  17: monaco.languages.SymbolKind.Boolean, 18: monaco.languages.SymbolKind.Array,
  19: monaco.languages.SymbolKind.Object, 20: monaco.languages.SymbolKind.Key,
  21: monaco.languages.SymbolKind.Null, 22: monaco.languages.SymbolKind.EnumMember,
  23: monaco.languages.SymbolKind.Struct, 24: monaco.languages.SymbolKind.Event,
  25: monaco.languages.SymbolKind.Operator, 26: monaco.languages.SymbolKind.TypeParameter,
};

function compare(lineA: number, columnA: number, lineB: number, columnB: number): number {
  return lineA === lineB ? columnA - columnB : lineA - lineB;
}
function contains(outer: monaco.IRange, inner: monaco.IRange): boolean {
  return compare(outer.startLineNumber, outer.startColumn, inner.startLineNumber, inner.startColumn) <= 0
    && compare(outer.endLineNumber, outer.endColumn, inner.endLineNumber, inner.endColumn) >= 0;
}
function isCompletionRange(range: monaco.IRange, position?: monaco.IPosition): boolean {
  if (range.startLineNumber !== range.endLineNumber || range.startColumn > range.endColumn) return false;
  return !position || contains(range, { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: position.column, endColumn: position.column });
}
function completionRange(item: LspCompletionItem, defaults: LspCompletionDefaults | undefined, fallback: monaco.IRange): monaco.IRange | monaco.languages.CompletionItemRanges {
  if (item.textEdit) return "range" in item.textEdit ? mapLspRange(item.textEdit.range) : { insert: mapLspRange(item.textEdit.insert), replace: mapLspRange(item.textEdit.replace) };
  if (!defaults?.editRange) return fallback;
  return "start" in defaults.editRange ? mapLspRange(defaults.editRange) : { insert: mapLspRange(defaults.editRange.insert), replace: mapLspRange(defaults.editRange.replace) };
}
function overlaps(a: monaco.IRange, b: monaco.IRange): boolean {
  const sameStart = compare(a.startLineNumber, a.startColumn, b.startLineNumber, b.startColumn) === 0;
  return sameStart || (compare(a.startLineNumber, a.startColumn, b.endLineNumber, b.endColumn) < 0
    && compare(b.startLineNumber, b.startColumn, a.endLineNumber, a.endColumn) < 0);
}

export function mapLspCompletionItem(item: LspCompletionItem, fallbackRange: monaco.IRange, defaults?: LspCompletionDefaults, position?: monaco.IPosition): Result<ScriptLspCompletion, string> {
  const range = completionRange(item, defaults, fallbackRange);
  const main = "replace" in range ? range.replace : range;
  if (!isCompletionRange(main, position)) return err("Completion edit must be on the cursor line.");
  if ("insert" in range && (!isCompletionRange(range.insert, position) || range.insert.startColumn !== range.replace.startColumn || !contains(range.replace, range.insert))) return err("Completion insert range must share the replacement start and fit inside it.");
  const additionalTextEdits = (item.additionalTextEdits ?? []).map((edit) => ({ range: mapLspRange(edit.range), text: edit.newText }));
  const ranges = [main, ...additionalTextEdits.map((edit) => edit.range)];
  if (ranges.some((a, index) => ranges.slice(index + 1).some((b) => overlaps(a, b)))) return err("Completion edits overlap.");
  const snippet = (item.insertTextFormat ?? defaults?.insertTextFormat) === 2;
  const whitespace = (item.insertTextMode ?? defaults?.insertTextMode ?? 1) === 1;
  const deprecated = item.deprecated || item.tags?.includes(1);
  return ok({
    label: item.labelDetails ? { label: item.label, ...item.labelDetails } : item.label,
    kind: completionKinds[item.kind ?? 1] ?? monaco.languages.CompletionItemKind.Text,
    detail: item.detail, documentation: mapLspDocumentation(item.documentation),
    insertText: item.textEdit?.newText ?? (defaults?.editRange ? item.textEditText : undefined) ?? item.insertText ?? item.label,
    insertTextRules: (snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : 0) | (whitespace ? monaco.languages.CompletionItemInsertTextRule.KeepWhitespace : 0),
    sortText: item.sortText, filterText: item.filterText, preselect: item.preselect,
    commitCharacters: (item.commitCharacters ?? defaults?.commitCharacters)?.filter((character) => character.length === 1),
    tags: deprecated ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
    additionalTextEdits, range, lspItem: materializeDefaults(item, defaults),
  });
}

function materializeDefaults(item: LspCompletionItem, defaults: LspCompletionDefaults | undefined): LspCompletionItem {
  const editRange = defaults?.editRange;
  const newText = item.textEditText ?? item.insertText ?? item.label;
  const textEdit = item.textEdit ?? (editRange ? "start" in editRange ? { range: editRange, newText } : { ...editRange, newText } : undefined);
  return { ...item, textEdit, insertTextFormat: item.insertTextFormat ?? defaults?.insertTextFormat,
    insertTextMode: item.insertTextMode ?? defaults?.insertTextMode,
    commitCharacters: item.commitCharacters ?? defaults?.commitCharacters,
    data: item.data === undefined ? defaults?.data : item.data };
}

export function mapLspCompletionResult(result: LspCompletionResult, fallbackRange: monaco.IRange, position?: monaco.IPosition): Result<ScriptLspCompletionList, string> {
  const items = Array.isArray(result) ? result : result.items;
  const defaults = Array.isArray(result) ? undefined : result.itemDefaults;
  const mapped = Result.combine(items.map((item) => mapLspCompletionItem(item, fallbackRange, defaults, position)));
  return mapped.map((suggestions) => ({ suggestions, incomplete: Array.isArray(result) ? false : result.isIncomplete ?? false }));
}

export function mapLspLocation(location: LspLocation, clientUri: (uri: string) => monaco.Uri): monaco.languages.Location {
  return { uri: clientUri(location.uri), range: mapLspRange(location.range) };
}
export function mapLspDefinition(result: LspDefinitionResult, clientUri: (uri: string) => monaco.Uri): monaco.languages.LocationLink[] {
  return (Array.isArray(result) ? result : [result]).map((location) => "targetUri" in location ? {
    uri: clientUri(location.targetUri), range: mapLspRange(location.targetRange), targetSelectionRange: mapLspRange(location.targetSelectionRange), originSelectionRange: location.originSelectionRange ? mapLspRange(location.originSelectionRange) : undefined,
  } : mapLspLocation(location, clientUri));
}
export function mapLspDocumentSymbol(symbol: LspDocumentSymbol): monaco.languages.DocumentSymbol {
  return { name: symbol.name, detail: symbol.detail ?? "", kind: symbolKinds[symbol.kind] ?? monaco.languages.SymbolKind.Variable,
    tags: symbol.tags?.includes(1) ? [monaco.languages.SymbolTag.Deprecated] : [],
    range: mapLspRange(symbol.range), selectionRange: mapLspRange(symbol.selectionRange), children: symbol.children?.map(mapLspDocumentSymbol) ?? [] };
}
