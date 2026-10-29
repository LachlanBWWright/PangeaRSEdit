interface Edit { start: number; end: number; lines: string[] }
export type TextMerge = { kind: "merged"; text: string } | { kind: "conflict"; reason: string };

function edits(base: string[], next: string[]): Edit[] {
  const width = next.length + 1;
  const lengths = new Uint16Array((base.length + 1) * width);
  for (let i = base.length - 1; i >= 0; i--) {
    for (let j = next.length - 1; j >= 0; j--)
      lengths[i * width + j] = base[i] === next[j] ? 1 + (lengths[(i + 1) * width + j + 1] ?? 0)
        : Math.max(lengths[(i + 1) * width + j] ?? 0, lengths[i * width + j + 1] ?? 0);
  }
  const changes: Edit[] = [];
  let i = 0, j = 0, start = -1, replacement: string[] = [];
  const flush = () => { if (start >= 0) changes.push({ start, end: i, lines: replacement }); start = -1; replacement = []; };
  while (i < base.length || j < next.length) {
    if (i < base.length && j < next.length && base[i] === next[j]) { flush(); i++; j++; continue; }
    if (start < 0) start = i;
    if (i < base.length && (j >= next.length || (lengths[(i + 1) * width + j] ?? 0) >= (lengths[i * width + j + 1] ?? 0))) i++;
    else { replacement.push(next[j] ?? ""); j++; }
  }
  flush();
  return changes;
}

function overlap(a: Edit, b: Edit) {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  if (a.start === a.end) return b.start < a.start && a.start < b.end;
  if (b.start === b.end) return a.start < b.start && b.start < a.end;
  return a.start < b.end && b.start < a.end;
}

export function mergeText(base: string, editor: string, disk: string): TextMerge {
  if (editor === disk || disk === base) return { kind: "merged", text: editor };
  if (editor === base) return { kind: "merged", text: disk };
  const before = base.split("\n"), local = editor.split("\n"), remote = disk.split("\n");
  if ([base, editor, disk].some((text) => text.length > 262144) || [before, local, remote].some((lines) => lines.length > 2000))
    return { kind: "conflict", reason: "This file is too large for automatic merging. Choose a version or resolve it in your external editor." };
  const left = edits(before, local), right = edits(before, remote);
  const combined = [...left];
  for (const candidate of right) {
    const identical = left.some((change) => change.start === candidate.start && change.end === candidate.end && change.lines.join("\n") === candidate.lines.join("\n"));
    if (identical) continue;
    if (left.some((change) => overlap(change, candidate))) return { kind: "conflict", reason: "Both versions changed the same lines." };
    combined.push(candidate);
  }
  combined.sort((a, b) => a.start - b.start || a.end - b.end);
  const output: string[] = [];
  let cursor = 0;
  for (const change of combined) { output.push(...before.slice(cursor, change.start), ...change.lines); cursor = change.end; }
  output.push(...before.slice(cursor));
  return { kind: "merged", text: output.join("\n") };
}
