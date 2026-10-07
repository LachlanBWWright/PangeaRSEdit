export interface LuaToken {
  readonly kind: "name" | "symbol" | "string" | "comment";
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly closed: boolean;
}

export function tokenizeLua(source: string): readonly LuaToken[] {
  const tokens: LuaToken[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor] ?? "")) { cursor++; continue; }
    const start = cursor;
    const comment = source.startsWith("--", cursor);
    const bracketStart = comment ? cursor + 2 : cursor;
    const bracket = source.slice(bracketStart).match(/^\[(=*)\[/);
    if (bracket) {
      const close = `]${bracket[1] ?? ""}]`;
      const end = source.indexOf(close, bracketStart + bracket[0].length);
      cursor = end < 0 ? source.length : end + close.length;
      tokens.push({ kind: comment ? "comment" : "string", text: source.slice(start, cursor), start, end: cursor, closed: end >= 0 });
      continue;
    }
    if (comment) {
      const end = source.indexOf("\n", cursor);
      cursor = end < 0 ? source.length : end;
      tokens.push({ kind: "comment", text: source.slice(start, cursor), start, end: cursor, closed: end >= 0 });
      continue;
    }
    const quote = source[cursor];
    if (quote === '"' || quote === "'") {
      cursor++;
      let closed = false;
      while (cursor < source.length) {
        if (source[cursor] === "\\") { cursor = Math.min(cursor + 2, source.length); continue; }
        if (source[cursor++] === quote) { closed = true; break; }
      }
      tokens.push({ kind: "string", text: source.slice(start, cursor), start, end: cursor, closed });
      continue;
    }
    const name = source.slice(cursor).match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0];
    cursor += name?.length ?? 1;
    tokens.push({ kind: name ? "name" : "symbol", text: name ?? source.slice(start, cursor), start, end: cursor, closed: true });
  }
  return tokens;
}

function qualifiedNameBefore(tokens: readonly LuaToken[], index: number): { name: string; startIndex: number } | null {
  const last = tokens[index];
  if (last?.kind !== "name") return null;
  let startIndex = index;
  while (tokens[startIndex - 1]?.text === "." && tokens[startIndex - 2]?.kind === "name") startIndex -= 2;
  return { name: tokens.slice(startIndex, index + 1).map((token) => token.text).join(""), startIndex };
}

export interface LuaCallSite { readonly name: string; readonly activeParameter: number; readonly argumentStart: number; }

export function findLuaCallSite(source: string, offset: number): LuaCallSite | null {
  const tokens = tokenizeLua(source.slice(0, offset)).filter((token) => token.kind !== "comment" && token.kind !== "string");
  const frames: { delimiter: string; name: string | null; activeParameter: number; argumentStart: number }[] = [];
  let pendingLoopDo = 0;
  for (const [index, token] of tokens.entries()) {
    if (["function", "if", "for", "while", "repeat"].includes(token.text)) {
      frames.push({ delimiter: token.text, name: null, activeParameter: 0, argumentStart: token.end });
      if (token.text === "for" || token.text === "while") pendingLoopDo++;
      continue;
    }
    if (token.text === "do") {
      if (pendingLoopDo > 0) pendingLoopDo--;
      else frames.push({ delimiter: "do", name: null, activeParameter: 0, argumentStart: token.end });
      continue;
    }
    if (token.text === "end" || token.text === "until") {
      const frame = frames.at(-1);
      if (frame && !["(", "{", "["].includes(frame.delimiter)) frames.pop();
      continue;
    }
    if (["(", "{", "["].includes(token.text)) {
      const name = token.text === "(" ? qualifiedNameBefore(tokens, index - 1) : null;
      const declared = name && tokens[name.startIndex - 1]?.text === "function";
      frames.push({ delimiter: token.text, name: declared ? null : name?.name ?? null, activeParameter: 0, argumentStart: token.end });
      continue;
    }
    if ([")", "}", "]"].includes(token.text)) {
      const expected: Readonly<Record<string, string>> = { ")": "(", "}": "{", "]": "[" };
      if (frames.at(-1)?.delimiter !== expected[token.text]) return null;
      frames.pop();
      continue;
    }
    const frame = frames.at(-1);
    if (token.text === "," && frame?.delimiter === "(") { frame.activeParameter++; frame.argumentStart = token.end; }
  }
  const frame = [...frames].reverse().find((entry) => entry.delimiter === "(");
  return frame?.name ? { name: frame.name, activeParameter: frame.activeParameter, argumentStart: frame.argumentStart } : null;
}

export function findLuaQualifiedToken(source: string, offset: number): { name: string; start: number; end: number } | null {
  const tokens = tokenizeLua(source);
  const index = tokens.findIndex((token) => token.kind === "name" && offset >= token.start && offset < token.end);
  if (index < 0) return null;
  let endIndex = index;
  while (tokens[endIndex + 1]?.text === "." && tokens[endIndex + 2]?.kind === "name") endIndex += 2;
  const qualified = qualifiedNameBefore(tokens, endIndex);
  const start = qualified ? tokens[qualified.startIndex]?.start : undefined;
  const end = tokens[endIndex]?.end;
  return qualified && start !== undefined && end !== undefined ? { name: qualified.name, start, end } : null;
}

export function luaNonCodeAtCursor(source: string, offset: number): LuaToken | null {
  return tokenizeLua(source).find((token) => (token.kind === "comment" || token.kind === "string") && offset > token.start && (offset < token.end || (offset === token.end && (!token.closed || (token.kind === "comment" && source[token.end] === "\n"))))) ?? null;
}

export interface LuaFunctionContext { readonly name: string; readonly parameters: readonly string[]; }

export function findLuaFunctionContext(source: string, offset: number): LuaFunctionContext | null {
  const tokens = tokenizeLua(source.slice(0, offset)).filter((token) => token.kind !== "comment" && token.kind !== "string");
  const blocks: { kind: string; context: LuaFunctionContext | null }[] = [];
  let pendingLoopDo = 0;
  for (const [index, token] of tokens.entries()) {
    if (token.text === "function") {
      const opening = tokens.slice(index + 1).findIndex((candidate) => candidate.text === "(");
      if (opening < 0) continue;
      const openIndex = index + 1 + opening;
      const close = tokens.slice(openIndex + 1).findIndex((candidate) => candidate.text === ")");
      const name = tokens.slice(index + 1, openIndex).map((candidate) => candidate.text).join("");
      const parameters = close < 0 ? [] : tokens.slice(openIndex + 1, openIndex + 1 + close).filter((candidate) => candidate.kind === "name").map((candidate) => candidate.text);
      blocks.push({ kind: "function", context: { name, parameters } });
    } else if (["if", "for", "while", "repeat"].includes(token.text)) {
      blocks.push({ kind: token.text, context: null });
      if (token.text === "for" || token.text === "while") pendingLoopDo++;
    } else if (token.text === "do") {
      if (pendingLoopDo > 0) pendingLoopDo--;
      else blocks.push({ kind: "do", context: null });
    } else if (token.text === "end" || token.text === "until") blocks.pop();
  }
  return [...blocks].reverse().find((block) => block.kind === "function")?.context ?? null;
}

export function findLuaExportedTable(source: string): string | null {
  const tokens = tokenizeLua(source).filter((token) => token.kind !== "comment" && token.kind !== "string");
  const targets = new Set<string>();
  for (const [index, token] of tokens.entries()) {
    const target = tokens[index + 1];
    if (token.text !== "return" || target?.kind !== "name" || findLuaFunctionContext(source, token.start)) continue;
    const next = tokens[index + 2];
    const lineEnd = source.indexOf("\n", target.end);
    if (next && next.start < (lineEnd < 0 ? source.length : lineEnd) && next.text !== ";" && next.text !== "end") continue;
    const declared = tokens.some((candidate, candidateIndex) => candidate.text === target.text && tokens[candidateIndex + 1]?.text === "=" && tokens[candidateIndex + 2]?.text === "{" && !findLuaFunctionContext(source, candidate.start));
    if (declared) targets.add(target.text);
  }
  return targets.size === 1 ? [...targets][0] ?? null : null;
}
