import { err, ok, type Result } from "neverthrow";
import { readLuaLongString, readLuaQuotedString } from "./scriptLuaStrings";

interface LuaToken {
  readonly kind: "identifier" | "string" | "symbol";
  readonly value: string | null;
}

function tokenizeLua(source: string): readonly LuaToken[] {
  const tokens: LuaToken[] = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index] ?? "";
    if (/\s/.test(character)) { index++; continue; }
    if (source.startsWith("--", index)) {
      const comment = readLuaLongString(source, index + 2);
      if (comment) { index = comment.end; continue; }
      index += 2;
      while (index < source.length && source[index] !== "\r" && source[index] !== "\n") index++;
      continue;
    }
    const literal = character === '"' || character === "'" ? readLuaQuotedString(source, index)
      : character === "[" ? readLuaLongString(source, index) : null;
    if (literal) {
      tokens.push({ kind: "string", value: literal.value });
      index = literal.end;
      continue;
    }
    if (/[a-zA-Z_]/.test(character)) {
      const start = index++;
      while (index < source.length && /[a-zA-Z0-9_]/.test(source[index] ?? "")) index++;
      tokens.push({ kind: "identifier", value: source.slice(start, index) });
      continue;
    }
    tokens.push({ kind: "symbol", value: character });
    index++;
  }
  return tokens;
}

export function collectLiteralLuaRequires(source: string): Result<readonly string[], string> {
  const tokens = tokenizeLua(source);
  const modules = new Set<string>();
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token?.kind !== "identifier" || token.value !== "require") continue;
    const previous = tokens[index - 1];
    if (previous?.kind === "symbol" && (previous.value === "." || previous.value === ":")) continue;
    const next = tokens[index + 1];
    const parenthesized = next?.kind === "symbol" && next.value === "(";
    const argumentIndex = index + (parenthesized ? 2 : 1);
    const argument = tokens[argumentIndex];
    if (argument?.kind !== "string") continue;
    if (argument.value === null) return err("Cannot collect a dependency from an invalid Lua string literal.");
    const closing = tokens[argumentIndex + 1];
    if (parenthesized && (closing?.kind !== "symbol" || closing.value !== ")")) continue;
    modules.add(argument.value);
  }
  return ok([...modules]);
}
