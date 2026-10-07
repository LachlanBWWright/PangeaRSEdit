import type { IRange } from "monaco-editor";
import type { LspRange } from "./scriptLspSchemas";

export function mapLspRange(range: LspRange): IRange {
  return { startLineNumber: range.start.line + 1, startColumn: range.start.character + 1, endLineNumber: range.end.line + 1, endColumn: range.end.character + 1 };
}
