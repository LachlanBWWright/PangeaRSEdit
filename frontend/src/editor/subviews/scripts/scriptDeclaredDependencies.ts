import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { readLuaLongString, readLuaQuotedString } from "./scriptLuaStrings";

export const scriptModuleNameSchema = z.string().regex(/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/, "Use a dotted Lua module name, such as helpers.objectives.");

interface DependencyComment { readonly start: number; readonly end: number; readonly name: string }

function dependencyComments(source: string): readonly DependencyComment[] {
  const comments: DependencyComment[] = [];
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("--", index)) {
      const long = readLuaLongString(source, index + 2);
      if (long) { index = long.end; continue; }
      const start = index;
      while (index < source.length && source[index] !== "\n" && source[index] !== "\r") index++;
      const declaration = /^---@dependency(?:\s+(.*))?$/.exec(source.slice(start, index));
      if (declaration) comments.push({ start, end: index, name: declaration[1]?.trim() ?? "" });
      continue;
    }
    const character = source[index];
    const literal = character === '"' || character === "'" ? readLuaQuotedString(source, index)
      : character === "[" ? readLuaLongString(source, index) : null;
    index = literal ? literal.end : index + 1;
  }
  return comments;
}

export function collectDeclaredLuaDependencies(source: string): Result<readonly string[], string> {
  const names = new Set<string>();
  for (const declaration of dependencyComments(source)) {
    const name = scriptModuleNameSchema.safeParse(declaration.name);
    if (!name.success) return err(`Invalid dependency '${declaration.name}': use a dotted Lua module name, such as helpers.objectives.`);
    if (name.data !== "pangea") names.add(name.data);
  }
  return ok([...names]);
}

export function setDeclaredLuaDependencies(source: string, names: readonly string[]): Result<string, string> {
  const parsed = z.array(scriptModuleNameSchema).safeParse(names);
  if (!parsed.success) return err(parsed.error.issues.map((issue) => issue.message).join(" "));
  let content = source;
  for (const comment of [...dependencyComments(source)].reverse()) {
    const newline = content.slice(comment.end).match(/^(?:\r\n|\n|\r)/)?.[0] ?? "";
    content = content.slice(0, comment.start) + content.slice(comment.end + newline.length);
  }
  const declarations = [...new Set(parsed.data)].filter((name) => name !== "pangea").sort();
  return ok(declarations.length ? declarations.map((name) => `---@dependency ${name}\n`).join("") + content : content);
}

export function moduleNameForSourcePath(path: string): string | null {
  const match = /^Data\/Scripts\/src\/(.+)\.lua$/.exec(path);
  if (!match?.[1]) return null;
  const name = match[1].replaceAll("/", ".");
  const parsed = scriptModuleNameSchema.safeParse(name);
  return parsed.success ? parsed.data : null;
}
