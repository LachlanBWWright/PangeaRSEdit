import { describe, expect, it } from "vitest";
import { completionEditsFitModel } from "./scriptCompletionModelRanges";

describe("completion edits against the live document", () => {
  const model = { getLineCount: () => 2, getLineMaxColumn: (line: number) => line === 1 ? 20 : 5 };
  const range = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 20 };
  const completion = { label: "call", insertText: "call()", kind: 1, range };

  it("accepts valid replacement, insert ranges and additional edits", () => {
    expect(completionEditsFitModel(model, completion)).toBe(true);
    expect(completionEditsFitModel(model, { ...completion, range: { insert: { ...range, endColumn: 2 }, replace: range }, additionalTextEdits: [{ range: { startLineNumber: 2, endLineNumber: 2, startColumn: 1, endColumn: 5 }, text: "" }] })).toBe(true);
  });

  it("rejects server edits that Monaco would clamp into a different edit", () => {
    expect(completionEditsFitModel(model, { ...completion, range: { ...range, endColumn: 999 } })).toBe(false);
    expect(completionEditsFitModel(model, { ...completion, range: { insert: { ...range, startColumn: 0 }, replace: range } })).toBe(false);
    expect(completionEditsFitModel(model, { ...completion, additionalTextEdits: [{ range: { ...range, startLineNumber: 9, endLineNumber: 9 }, text: "" }] })).toBe(false);
  });
});
