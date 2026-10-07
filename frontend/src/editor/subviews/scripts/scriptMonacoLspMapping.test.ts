import { describe, expect, it, vi } from "vitest";
import * as monaco from "monaco-editor";
import { lspCompletionResultSchema, lspDefinitionResultSchema, lspHoverSchema, lspRangeSchema, lspSignatureHelpSchema, lspDocumentSymbolSchema } from "./scriptLspSchemas";
import { mapLspCompletionResult, mapLspDefinition, mapLspDocumentSymbol, mapLspHover, mapLspSignatureHelp } from "./scriptMonacoLspMapping";

vi.mock("monaco-editor", () => ({
  Uri: { parse: (value: string) => ({ toString: () => value }) },
  languages: {
    CompletionItemKind: Object.fromEntries(["Method", "Function", "Constructor", "Field", "Variable", "Class", "Struct", "Interface", "Module", "Property", "Event", "Operator", "Unit", "Value", "Constant", "Enum", "EnumMember", "Keyword", "Text", "Color", "File", "Reference", "Customcolor", "Folder", "TypeParameter", "User", "Issue", "Tool", "Snippet"].map((name, index) => [name, index])),
    SymbolKind: Object.fromEntries(["File", "Module", "Namespace", "Package", "Class", "Method", "Property", "Field", "Constructor", "Enum", "Interface", "Function", "Variable", "Constant", "String", "Number", "Boolean", "Array", "Object", "Key", "Null", "EnumMember", "Struct", "Event", "Operator", "TypeParameter"].map((name, index) => [name, index])),
    CompletionItemInsertTextRule: { InsertAsSnippet: 4, KeepWhitespace: 1 }, CompletionItemTag: { Deprecated: 1 }, SymbolTag: { Deprecated: 1 },
  },
}));

function range(line: number, start: number, end: number) {
  return { start: { line, character: start }, end: { line, character: end } };
}
const fallback = { startLineNumber: 3, endLineNumber: 3, startColumn: 2, endColumn: 5 };
const cursor = { lineNumber: 3, column: 4 };

describe("LSP to Monaco mapping", () => {
  it("preserves snippets, list defaults, additional edits, labels, sorting and untrusted Markdown", () => {
    const parsed = lspCompletionResultSchema.safeParse({
      isIncomplete: true, itemDefaults: { editRange: range(2, 1, 4), insertTextFormat: 2, insertTextMode: 1, commitCharacters: ["(", "long"], data: { source: "defaults" } },
      items: [{ label: "heal", labelDetails: { detail: "(amount)", description: "player" }, kind: 3, textEditText: "heal(${1:amount})$0", sortText: "0001", filterText: "heal", preselect: true, documentation: { kind: "markdown", value: "**Heal** the player" }, tags: [1], additionalTextEdits: [{ range: range(0, 0, 0), newText: "local player = require('player')\n" }] }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const result = mapLspCompletionResult(parsed.data, fallback, cursor);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const item = result.value.suggestions[0];
    expect(result.value.incomplete).toBe(true);
    expect(item?.label).toEqual({ label: "heal", detail: "(amount)", description: "player" });
    expect(item?.kind).toBe(monaco.languages.CompletionItemKind.Function);
    expect(item?.insertText).toBe("heal(${1:amount})$0");
    expect(item?.insertTextRules).toBe(5);
    expect(item?.range).toEqual(fallback);
    expect(item?.additionalTextEdits).toEqual([{ range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 }, text: "local player = require('player')\n" }]);
    expect(item?.sortText).toBe("0001"); expect(item?.filterText).toBe("heal"); expect(item?.preselect).toBe(true);
    expect(item?.documentation).toEqual({ value: "**Heal** the player", isTrusted: false, supportHtml: false });
    expect(item?.commitCharacters).toEqual(["("]);
    expect(item?.tags).toEqual([1]);
    expect(item?.lspItem.textEdit).toEqual({ range: range(2, 1, 4), newText: "heal(${1:amount})$0" });
    expect(item?.lspItem.data).toEqual({ source: "defaults" });
  });

  it("uses explicit InsertReplaceEdits over defaults and preserves explicit null resolve data", () => {
    const parsed = lspCompletionResultSchema.safeParse({ itemDefaults: { insertTextFormat: 2, data: { default: true }, editRange: range(2, 0, 6) }, items: [{ label: "x", insertText: "ignored", insertTextFormat: 1, insertTextMode: 2, data: null, textEdit: { insert: range(2, 1, 3), replace: range(2, 1, 5), newText: "replacement" } }] });
    if (!parsed.success) return;
    const result = mapLspCompletionResult(parsed.data, fallback, cursor);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.suggestions[0]?.insertText).toBe("replacement");
    expect(result.value.suggestions[0]?.insertTextRules).toBe(0);
    expect(result.value.suggestions[0]?.range).toEqual({ insert: { ...fallback, endColumn: 4 }, replace: { ...fallback, endColumn: 6 } });
    expect(result.value.suggestions[0]?.lspItem.data).toBeNull();
  });

  it("rejects completion edits outside the cursor line, incompatible insert ranges and overlapping edits", () => {
    const candidates = [
      { label: "bad", textEdit: { range: range(1, 0, 3), newText: "bad" } },
      { label: "bad", textEdit: { insert: range(2, 0, 4), replace: range(2, 1, 5), newText: "bad" } },
      { label: "bad", textEdit: { range: range(2, 1, 4), newText: "bad" }, additionalTextEdits: [{ range: range(2, 2, 3), newText: "overlap" }] },
      { label: "bad", additionalTextEdits: [{ range: range(0, 0, 0), newText: "first" }, { range: range(0, 0, 0), newText: "second" }] },
    ];
    for (const candidate of candidates) {
      const parsed = lspCompletionResultSchema.safeParse([candidate]);
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(mapLspCompletionResult(parsed.data, fallback, cursor).isErr()).toBe(true);
    }
    expect(lspRangeSchema.safeParse(range(0, 4, 1)).success).toBe(false);
  });

  it("renders hover code with safe fences, preserves Markdown and escapes plaintext", () => {
    const parsed = lspHoverSchema.safeParse({ contents: [{ language: "lua", value: "local fence = '```'" }, { kind: "markdown", value: "**Docs**" }, { kind: "plaintext", value: "*literal* <command>" }], range: range(2, 0, 6) });
    if (!parsed.success) return;
    const hover = mapLspHover(parsed.data, fallback);
    expect(hover.contents[0]?.value).toBe("````lua\nlocal fence = '```'\n````");
    expect(hover.contents[1]?.value).toBe("**Docs**");
    expect(hover.contents[2]?.value).toBe("\\*literal\\* \\<command\\>");
    expect(hover.contents.every((content) => content.isTrusted === false && content.supportHtml === false)).toBe(true);
    expect(hover.range).toEqual({ ...fallback, startColumn: 1, endColumn: 7 });
  });

  it("preserves signature parameter offsets and documentation, preferring per-signature active parameters", () => {
    const parsed = lspSignatureHelpSchema.safeParse({ signatures: [{ label: "heal(amount, player)", documentation: { kind: "markdown", value: "**heal**" }, parameters: [{ label: [5, 11], documentation: { kind: "plaintext", value: "Amount" } }, { label: "player" }], activeParameter: 1 }], activeSignature: 0, activeParameter: 0 });
    if (!parsed.success) return;
    const help = mapLspSignatureHelp(parsed.data).value;
    expect(help.activeParameter).toBe(1);
    expect(help.signatures[0]?.parameters[0]).toEqual({ label: [5, 11], documentation: "Amount" });
    expect(help.signatures[0]?.documentation).toEqual({ value: "**heal**", isTrusted: false, supportHtml: false });
    expect(lspSignatureHelpSchema.safeParse({ signatures: [{ label: "short", parameters: [{ label: [2, 99] }] }] }).success).toBe(false);
    const invalidActive = lspSignatureHelpSchema.safeParse({ signatures: [{ label: "f(x)", parameters: [{ label: "x" }] }], activeSignature: 7, activeParameter: 9 });
    if (invalidActive.success) expect(mapLspSignatureHelp(invalidActive.data).value).toMatchObject({ activeSignature: 0, activeParameter: 0 });
  });

  it("preserves LocationLink origin and target selection and maps symbols independently of LSP numbering", () => {
    const parsed = lspDefinitionResultSchema.safeParse([{ targetUri: "file:///source.lua", targetRange: range(1, 0, 20), targetSelectionRange: range(1, 9, 15), originSelectionRange: range(0, 0, 6) }]);
    if (!parsed.success) return;
    const mapped = mapLspDefinition(parsed.data, monaco.Uri.parse);
    expect(mapped[0]?.uri.toString()).toBe("file:///source.lua");
    expect(mapped[0]?.targetSelectionRange).toEqual({ startLineNumber: 2, endLineNumber: 2, startColumn: 10, endColumn: 16 });
    expect(mapped[0]?.originSelectionRange).toEqual({ startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 7 });
    expect(lspDefinitionResultSchema.safeParse([{ targetUri: "file:///source.lua", targetRange: range(1, 0, 4), targetSelectionRange: range(1, 3, 8) }]).success).toBe(false);
    const symbol = lspDocumentSymbolSchema.safeParse({ name: "function", kind: 12, tags: [1], range: range(0, 0, 9), selectionRange: range(0, 0, 8), children: [{ name: "variable", kind: 13, range: range(0, 0, 2), selectionRange: range(0, 0, 2) }] });
    if (symbol.success) {
      expect(mapLspDocumentSymbol(symbol.data).kind).toBe(monaco.languages.SymbolKind.Function);
      expect(mapLspDocumentSymbol(symbol.data).children?.[0]?.kind).toBe(monaco.languages.SymbolKind.Variable);
      expect(mapLspDocumentSymbol(symbol.data).tags).toEqual([1]);
    }
  });
});
