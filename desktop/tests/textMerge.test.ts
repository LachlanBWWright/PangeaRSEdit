import { expect, it } from "vitest";
import { mergeText } from "@pangea/desktop-contracts";

it.each([
  ["a\nb\nc\n", "A\nb\nc\n", "a\nb\nC\n", "A\nb\nC\n"],
  ["a\nb", "new\na\nb", "a\nB", "new\na\nB"],
  ["a\nb\nc", "a\nc", "a\nb\nC", "a\nC"],
  ["a\nb\nc\nd", "A\nb\nc\nD", "a\nB\nc\nd", "A\nB\nc\nD"],
  ["a\r\nb\r\n", "A\r\nb\r\n", "a\r\nB\r\n", "A\r\nB\r\n"],
  ["", "new", "", "new"],
  ["a", "a", "disk", "disk"],
  ["a", "same", "same", "same"],
])("merges independent edits while preserving line endings", (base, editor, disk, expected) => {
  expect(mergeText(base, editor, disk)).toEqual({ kind: "merged", text: expected });
});

it.each([
  ["a\nb", "A\nb", "other\nb"],
  ["a\nb", "insert\na\nb", "different\na\nb"],
  ["a\nb\nc", "replacement", "a\nB\nc"],
])("requires a decision for overlapping edits", (base, editor, disk) => {
  expect(mergeText(base, editor, disk).kind).toBe("conflict");
});

it("bounds automatic merge work for large files", () => {
  const base = "x\n".repeat(2100);
  expect(mergeText(base, `local\n${base}`, `${base}remote`).kind).toBe("conflict");
});
