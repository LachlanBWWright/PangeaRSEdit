import type { editor, IRange, languages } from "monaco-editor";

function rangeFitsModel(model: Pick<editor.ITextModel, "getLineCount" | "getLineMaxColumn">, range: IRange): boolean {
  if (range.startLineNumber < 1 || range.endLineNumber > model.getLineCount() || range.startLineNumber > range.endLineNumber) return false;
  if (range.startLineNumber === range.endLineNumber && range.startColumn > range.endColumn) return false;
  return range.startColumn >= 1 && range.endColumn >= 1
    && range.startColumn <= model.getLineMaxColumn(range.startLineNumber)
    && range.endColumn <= model.getLineMaxColumn(range.endLineNumber);
}

export function completionEditsFitModel(model: Pick<editor.ITextModel, "getLineCount" | "getLineMaxColumn">, completion: languages.CompletionItem): boolean {
  const primary = "replace" in completion.range ? [completion.range.insert, completion.range.replace] : [completion.range];
  return [...primary, ...(completion.additionalTextEdits ?? []).map((edit) => edit.range)].every((range) => rangeFitsModel(model, range));
}
