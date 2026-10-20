export type ScriptGuideBlock =
  | { kind: "heading"; text: string; level: number }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; text: string; language: string }
  | { kind: "list"; items: readonly string[]; ordered: boolean }
  | { kind: "table"; rows: readonly (readonly string[])[] };

export function scriptGuideSections(content: string): readonly { title: string; anchor: string; content: string }[] {
  const sections: { title: string; anchor: string; content: string }[] = [];
  let title = "Overview";
  let anchor = "";
  let lines: string[] = [];
  for (const line of content.split("\n")) {
    if (line.startsWith("## ")) {
      if (lines.length) sections.push({ title, anchor, content: lines.join("\n") });
      title = line.slice(3);
      anchor = title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      lines = [];
    }
    lines.push(line);
  }
  if (lines.length) sections.push({ title, anchor, content: lines.join("\n") });
  return sections;
}

function tableCells(line: string): readonly string[] {
  const cells: string[] = [];
  let cell = "";
  let code = false;
  for (const character of line.trim().replace(/^\||\|$/g, "")) {
    if (character === "`") code = !code;
    if (character === "|" && !code) { cells.push(cell.trim()); cell = ""; }
    else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

export function scriptGuideBlocks(content: string): readonly ScriptGuideBlock[] {
  const lines = content.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const blocks: ScriptGuideBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    index += 1;
    if (!line.trim()) continue;
    const heading = /^(#{1,6})\s+(.+)/.exec(line);
    if (heading?.[1] && heading[2]) { blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] }); continue; }
    if (line.startsWith("```")) {
      const code: string[] = [];
      while (index < lines.length && !lines[index]?.startsWith("```")) { code.push(lines[index] ?? ""); index += 1; }
      index += 1;
      blocks.push({ kind: "code", text: code.join("\n"), language: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [tableCells(line)];
      while (index < lines.length && lines[index]?.startsWith("|")) {
        const row = lines[index] ?? "";
        if (!/^[\s|:-]+$/.test(row)) rows.push(tableCells(row));
        index += 1;
      }
      blocks.push({ kind: "table", rows }); continue;
    }
    if (/^(?:[-*]|\d+\.)\s+/.test(line)) {
      const items = [line.replace(/^(?:[-*]|\d+\.)\s+/, "")];
      while (index < lines.length && /^(?:\s+\S|[-*]\s|\d+\.\s)/.test(lines[index] ?? "")) {
        const next = lines[index] ?? "";
        if (/^(?:[-*]|\d+\.)\s+/.test(next)) items.push(next.replace(/^(?:[-*]|\d+\.)\s+/, ""));
        else items[items.length - 1] = `${items.at(-1) ?? ""} ${next.trim()}`;
        index += 1;
      }
      blocks.push({ kind: "list", ordered: /^\d/.test(line), items }); continue;
    }
    const paragraph = [line];
    while (index < lines.length && lines[index]?.trim() && !/^(?:#|```|\||[-*]\s|\d+\.\s)/.test(lines[index] ?? "")) {
      paragraph.push(lines[index] ?? ""); index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}
