import * as monaco from "monaco-editor";
import { z } from "zod";
import type { LspCompletionItem, LspRange } from "./scriptLspSchemas";

export function mapLspRange(range: LspRange): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

export function lspDocumentation(content: string | { kind: "plaintext" | "markdown"; value: string } | undefined): monaco.IMarkdownString | undefined {
  if (content === undefined) return undefined;
  const plain = z.string().safeParse(content);
  if (plain.success) return { value: plain.data };
  const markup = z.object({ kind: z.enum(["plaintext", "markdown"]), value: z.string() }).safeParse(content);
  if (!markup.success) return undefined;
  return { value: markup.data.kind === "plaintext" ? markup.data.value.replace(/[\\`*_{}[\]()#+.!|<>-]/g, "\\$&") : markup.data.value };
}

function completionKind(kind: number | undefined): monaco.languages.CompletionItemKind {
  const kinds = monaco.languages.CompletionItemKind;
  const mapping = [kinds.Text, kinds.Method, kinds.Function, kinds.Constructor, kinds.Field, kinds.Variable, kinds.Class, kinds.Interface, kinds.Module, kinds.Property, kinds.Unit, kinds.Value, kinds.Enum, kinds.Keyword, kinds.Snippet, kinds.Color, kinds.File, kinds.Reference, kinds.Folder, kinds.EnumMember, kinds.Constant, kinds.Struct, kinds.Event, kinds.Operator, kinds.TypeParameter];
  return kind === undefined ? kinds.Property : mapping[kind - 1] ?? kinds.Property;
}

export function mapLspCompletionItem(item: LspCompletionItem, range: monaco.IRange): monaco.languages.CompletionItem {
  const edit = item.textEdit;
  const editRange = edit && ("range" in edit ? mapLspRange(edit.range) : { insert: mapLspRange(edit.insert), replace: mapLspRange(edit.replace) });
  return {
    label: item.label,
    kind: completionKind(item.kind),
    detail: item.detail,
    documentation: lspDocumentation(item.documentation),
    insertText: edit?.newText ?? item.insertText ?? item.label,
    insertTextRules: item.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
    range: editRange ?? range,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
    additionalTextEdits: item.additionalTextEdits?.map((extra) => ({ range: mapLspRange(extra.range), text: extra.newText })),
  };
}
