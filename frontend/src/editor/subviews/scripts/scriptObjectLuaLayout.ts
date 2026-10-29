import { err, ok, type Result } from "neverthrow";

interface Token { value: string; start: number; end: number; string: boolean }
export interface ObjectLuaLayout { position: number; variable?: string; handlers: ReadonlySet<string> }

function longStringEnd(source: string, start: number): number | undefined {
  const opening = source.slice(start).match(/^\[(=*)\[/);
  if (!opening) return undefined;
  const end = source.indexOf(`]${opening[1]}]`, start + opening[0].length);
  return end < 0 ? source.length : end + opening[0].length;
}

function stringValue(raw: string): string {
  const bytes: number[] = [];
  const body = raw.slice(1, -1);
  for (let i = 0; i < body.length; i++) {
    const character = body[i] ?? "";
    if (character !== "\\") { bytes.push(...new TextEncoder().encode(character)); continue; }
    const escaped = body[++i] ?? "";
    const decimal = body.slice(i).match(/^\d{1,3}/)?.[0];
    if (decimal) { bytes.push(Number(decimal)); i += decimal.length - 1; continue; }
    const hexadecimal = escaped === "x" ? body.slice(i + 1, i + 3) : "";
    if (/^[\da-f]{2}$/i.test(hexadecimal)) { bytes.push(Number.parseInt(hexadecimal, 16)); i += 2; continue; }
    const escapes: Record<string, number> = { n: 10, r: 13, t: 9, a: 7, b: 8, f: 12, v: 11 };
    bytes.push(escapes[escaped] ?? escaped.charCodeAt(0));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < source.length;) {
    const start = i;
    const character = source[i] ?? "";
    if (/\s/.test(character)) { i++; continue; }
    if (source.startsWith("--", i)) {
      i = longStringEnd(source, i + 2) ?? source.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    const longEnd = longStringEnd(source, i);
    if (longEnd !== undefined) {
      i = longEnd;
      tokens.push({ value: "", start, end: i, string: true });
      continue;
    }
    if (character === '"' || character === "'") {
      i++;
      while (i < source.length && source[i] !== character) i += source[i] === "\\" ? 2 : 1;
      i = Math.min(i + 1, source.length);
      tokens.push({ value: stringValue(source.slice(start, i)), start, end: i, string: true });
      continue;
    }
    const identifier = source.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/)?.[0];
    i += identifier?.length ?? 1;
    tokens.push({ value: identifier ?? character, start, end: i, string: false });
  }
  return tokens;
}

function matchingBrace(tokens: readonly Token[], start: number): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    if (tokens[i]?.string) continue;
    if (tokens[i]?.value === "{") depth++;
    if (tokens[i]?.value === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function tokenScopes(tokens: readonly Token[]): readonly string[] {
  const stack: number[] = [];
  return tokens.map((token, index) => {
    if (!token.string && ["end", "until"].includes(token.value)) stack.pop();
    const scope = stack.join("/");
    if (!token.string && ["function", "if", "do", "repeat"].includes(token.value)) stack.push(index);
    return scope;
  });
}

function fieldValue(tokens: readonly Token[], start: number, end: number, key: string): number {
  let blocks = 0;
  let value = -1;
  for (let i = start + 1; i < end; i++) {
    const token = tokens[i];
    if (!token?.string && ["function", "if", "do", "repeat"].includes(token?.value ?? "")) blocks++;
    if (!token?.string && ["end", "until"].includes(token?.value ?? "")) blocks--;
    if (blocks > 0) continue;
    if (tokens[i]?.value === "{" && !tokens[i]?.string) { i = matchingBrace(tokens, i); if (i < 0) break; continue; }
    if (!tokens[i]?.string && tokens[i]?.value === key && tokens[i + 1]?.value === "=") value = i + 2;
    if (tokens[i]?.value === "[" && tokens[i + 1]?.string && tokens[i + 1]?.value === key && tokens[i + 2]?.value === "]" && tokens[i + 3]?.value === "=") value = i + 4;
  }
  return value;
}

interface TableReference { table: number; variable?: string }

function tableDepths(tokens: readonly Token[]): readonly number[] {
  let depth = 0;
  return tokens.map((token) => {
    const current = depth;
    if (!token.string && token.value === "{") depth++;
    if (!token.string && token.value === "}") depth--;
    return current;
  });
}

function resolveTable(tokens: readonly Token[], scopes: readonly string[], value: number, before: number, scope: string, remaining = 64): TableReference | undefined {
  if (remaining === 0) return undefined;
  const token = tokens[value];
  if (!token || token.string) return undefined;
  if (token.value === "{") return { table: value };
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token.value)) return undefined;
  const depths = tableDepths(tokens);
  for (let i = before - 1; i >= 0; i--) {
    if (depths[i] !== 0 || tokens[i]?.string || tokens[i]?.value !== token.value) continue;
    if (scopes[i] !== scope && (deferredScope(tokens, scopes[i] ?? "", scope) || tokens[i - 1]?.value === "local")) continue;
    let assignmentEnd = i + 1;
    while (tokens[assignmentEnd]?.value === "," && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tokens[assignmentEnd + 1]?.value ?? "")) assignmentEnd += 2;
    if ((assignmentEnd > i + 1 && tokens[assignmentEnd]?.value === "=") || (tokens[i + 1]?.value === "=" && tokens[i - 1]?.value === ",")) return undefined;
    if (tokens[i + 1]?.value !== "=") continue;
    if ([".", "["].includes(tokens[i - 1]?.value ?? "")) continue;
    if (scopes[i] !== scope) return undefined;
    const next = tokens[i + 3]?.value ?? "";
    const nextStatement = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(next) && ["=", ".", "[", "("].includes(tokens[i + 4]?.value ?? "");
    if (tokens[i + 2]?.value !== "{" && !["local", "return", "function", ";", "end", ""].includes(next) && !nextStatement) return undefined;
    const reference = resolveTable(tokens, scopes, i + 2, i, scope, remaining - 1);
    return reference ? { ...reference, variable: token.value } : undefined;
  }
  return undefined;
}

function assignedField(tokens: readonly Token[], index: number): { key?: string; value: number } | undefined {
  if (tokens[index + 1]?.value === "." && tokens[index + 3]?.value === "=") return { key: tokens[index + 2]?.value, value: index + 4 };
  if (tokens[index + 1]?.value !== "[") return undefined;
  const close = tokens.findIndex((token, cursor) => cursor > index + 1 && token.value === "]" && !token.string);
  if (close < 0 || tokens[close + 1]?.value !== "=") return undefined;
  return { key: close === index + 3 && tokens[index + 2]?.string ? tokens[index + 2]?.value : undefined, value: close + 2 };
}

function exportedValue(tokens: readonly Token[], scopes: readonly string[], reference: TableReference, key: string, before: number, scope: string): number {
  let value = fieldValue(tokens, reference.table, matchingBrace(tokens, reference.table), key);
  for (let i = matchingBrace(tokens, reference.table) + 1; i < before; i++) {
    if (tokens[i]?.string || deferredScope(tokens, scopes[i] ?? "", scope)) continue;
    const assignment = assignedField(tokens, i);
    if (!assignment) continue;
    const target = resolveTable(tokens, scopes, i, i, scope);
    if (target?.table !== reference.table) continue;
    if (scopes[i] !== scope) return -1;
    if (!assignment.key) return -1;
    if (assignment.key === key) value = assignment.value;
  }
  return value;
}

function deferredScope(tokens: readonly Token[], current: string, scope: string): boolean {
  if (current === scope) return false;
  if (scope && !current.startsWith(`${scope}/`)) return true;
  return current.slice(scope.length).split("/").some((part) => part !== "" && tokens[Number(part)]?.value === "function");
}

function functionValue(tokens: readonly Token[], scopes: readonly string[], value: number, scope: string, remaining = 64): boolean | undefined {
  if (remaining === 0 || tokens[value]?.string) return undefined;
  const name = tokens[value]?.value;
  if (name === "function") {
    const end = tokens.findIndex((token, index) => index > value && scopes[index] === scope && !token.string && token.value === "end");
    return end >= 0 && !["(", ".", "[", "and", "or"].includes(tokens[end + 1]?.value ?? "") ? true : undefined;
  }
  if ([".", "[", "(", "+", "-", "*", "/", "and", "or"].includes(tokens[value + 1]?.value ?? "")) return undefined;
  if (name === "nil") return false;
  const depths = tableDepths(tokens);
  for (let i = value - 1; i >= 0; i--) {
    if (depths[i] !== 0 || tokens[i]?.string) continue;
    if (scopes[i] !== scope) {
      if (!deferredScope(tokens, scopes[i] ?? "", scope) && tokens[i]?.value === name && tokens[i + 1]?.value === "=" && tokens[i - 1]?.value !== "local") return undefined;
      continue;
    }
    if (tokens[i]?.value === "function" && tokens[i + 1]?.value === name && tokens[i + 2]?.value === "(") return true;
    if (tokens[i]?.value === name && tokens[i + 1]?.value === "=" && ![".", "["].includes(tokens[i - 1]?.value ?? "")) return functionValue(tokens, scopes, i + 2, scope, remaining - 1);
  }
  return undefined;
}

function resolveLayout(tokens: readonly Token[], exportName: string, before: number, scope = ""): Result<ObjectLuaLayout, string> {
  const scopes = tokenScopes(tokens);
  for (let r = before - 1; r >= 0; r--) {
    if (scopes[r] !== scope || tokens[r]?.string || tokens[r]?.value !== "return") continue;
    if (tokens[r + 1]?.value !== "{" && [".", "[", "(", "+", "-", "*", "/", "and", "or"].includes(tokens[r + 2]?.value ?? "")) break;
    const exports = resolveTable(tokens, scopes, r + 1, r, scope);
    if (!exports) break;
    const value = exportedValue(tokens, scopes, exports, exportName, r, scope);
    if (value < 0) break;
    // Copies wrap the original module and index its original export; follow that
    // explicit alias rather than renaming identifiers throughout user code.
    if (tokens[value]?.value === "copiedExports" && tokens[value + 1]?.value === "[" && tokens[value + 2]?.string && tokens[value + 3]?.value === "]" && [",", ";", "}"].includes(tokens[value + 4]?.value ?? "")) {
      for (let i = r - 1; i >= 0; i--) {
        if (scopes[i] !== scope || tokens[i]?.string || tokens[i]?.value !== "copiedExports") continue;
        if (tokens[i + 1]?.value === "=" && tokens[i + 2]?.value === "(" && tokens[i + 3]?.value === "function") {
          return resolveLayout(tokens, tokens[value + 2]?.value ?? "", r, `${scope}${scope ? "/" : ""}${i + 3}`);
        }
      }
      break;
    }
    if (tokens[value]?.value !== "{" && [".", "[", "(", "+", "-", "*", "/", "and", "or"].includes(tokens[value + 1]?.value ?? "")) break;
    const reference = resolveTable(tokens, scopes, value, value < r ? value : r, scope);
    const table = reference?.table ?? -1;
    const variable = reference?.variable;
    if (table < 0) break;
    const tableEnd = matchingBrace(tokens, table);
    if (tableEnd < 0) break;
    const handlers = new Set<string>();
    for (let i = table + 1; i < tableEnd; i++) {
      const key = tokens[i]?.value;
      if (!key || !/^on[A-Z]/.test(key)) continue;
      const handlerValue = fieldValue(tokens, table, tableEnd, key);
      if (handlerValue < 0) continue;
      const callback = functionValue(tokens, scopes, handlerValue, scope);
      if (callback) handlers.add(key);
      else if (callback === undefined) return err("A behavior callback uses a computed value. Open its Lua source to edit that callback directly.");
    }
    if (table !== value) {
      for (let i = tableEnd + 1; i < r; i++) {
        if (tokens[i]?.string || ![".", "["].includes(tokens[i + 1]?.value ?? "")) continue;
        const declarationScope = scopes[tokens[i - 1]?.value === "function" ? i - 1 : i];
        if (deferredScope(tokens, declarationScope ?? "", scope)) continue;
        const target = resolveTable(tokens, scopes, i, i, scope);
        if (target?.table !== table) continue;
        const dotted = tokens[i + 1]?.value === "." ? tokens[i + 2]?.value : undefined;
        const indexed = tokens[i + 1]?.value === "[" && tokens[i + 2]?.string && tokens[i + 3]?.value === "]" ? tokens[i + 2]?.value : undefined;
        const end = i + (dotted ? 3 : 4);
        const assignment = assignedField(tokens, i);
        const namedFunction = tokens[i - 1]?.value === "function";
        if (!assignment && !namedFunction) continue;
        if (declarationScope !== scope || (assignment && !assignment.key)) return err("The behavior has conditional or computed-key assignments. Open its Lua source to add the callback directly.");
        const key = dotted ?? indexed;
        if (!key || !/^on[A-Z]/.test(key)) continue;
        const callback = namedFunction ? true : functionValue(tokens, scopes, end + 1, scope);
        if (callback) handlers.add(key);
        else if (callback === false) handlers.delete(key);
        else return err("A behavior callback uses a computed value. Open its Lua source to edit that callback directly.");
      }
    }
    const stableVariable = variable && resolveTable(tokens, scopes, value, r, scope)?.table === table ? variable : undefined;
    const position = stableVariable ? tokens[r]?.start : tokens[table]?.end;
    if (position !== undefined) return ok({ position, variable: stableVariable, handlers });
  }
  return err("The exported behavior could not be resolved safely. Use a local behavior table and a literal export name, or open the Lua source and add the callback directly. Dynamic export keys and computed behavior values require manual editing.");
}

export function objectLuaLayout(source: string, exportName: string): Result<ObjectLuaLayout, string> {
  const tokens = tokenize(source);
  return resolveLayout(tokens, exportName, tokens.length);
}
