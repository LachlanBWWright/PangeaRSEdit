import { err, ok, type Result } from "neverthrow";
import { buildMapPredicate, buildTerrainPredicate } from "./scriptWorkspaceStateRuntime";
import type { ScriptMapItemBinding, ScriptTerrainBinding } from "./scriptWorkspaceStateTypes";

type Binding = ScriptTerrainBinding | ScriptMapItemBinding;

function maskLuaNonCode(source: string): string {
  const masked = source.split("");
  let cursor = 0;
  while (cursor < source.length) {
    const start = cursor;
    const comment = source.startsWith("--", cursor);
    const bracketStart = comment ? cursor + 2 : cursor;
    const bracket = source.slice(bracketStart).match(/^\[(=*)\[/);
    if (bracket) {
      const close = `]${bracket[1] ?? ""}]`;
      const end = source.indexOf(close, bracketStart + bracket[0].length);
      cursor = end < 0 ? source.length : end + close.length;
      masked.fill(" ", start, cursor);
      continue;
    }
    if (comment) {
      const end = source.indexOf("\n", cursor);
      cursor = end < 0 ? source.length : end;
      masked.fill(" ", start, cursor);
      continue;
    }
    const quote = source[cursor];
    if (quote !== "'" && quote !== '"') { cursor++; continue; }
    cursor++;
    while (cursor < source.length) {
      if (source[cursor] === "\\") { cursor += 2; continue; }
      if (source[cursor++] === quote) break;
    }
    masked.fill(" ", start, cursor);
  }
  return masked.join("");
}

export function nativeBindingPredicate(binding: Binding): string {
  return binding.kind === "terrainItem" ? buildTerrainPredicate(binding.signature) : buildMapPredicate(binding.signature);
}

export function retargetNativeBindingSource(content: string, binding: Binding, updated: Binding): Result<string, string> {
  const code = maskLuaNonCode(content);
  const functions = [...code.matchAll(/\blocal\s+function\s+matchesTarget\s*\(\s*ctx\s*\)\s+return\s+([\s\S]*?)\s+end\b/g)];
  const match = functions[0];
  const expression = match?.[1];
  const hook = binding.kind === "terrainItem" ? "onTerrainItem" : "onMapItem";
  const hookDefinitions = new RegExp(`\\bfunction\\s+module\\.${hook}\\s*\\(`, "g");
  const assignments = new RegExp(`\\b(?:matchesTarget|module\\.${hook})\\s*=`);
  const guardedHook = new RegExp(`\\bfunction\\s+module\\.${hook}\\s*\\(\\s*ctx\\s*\\)\\s+if\\s+not\\s+matchesTarget\\s*\\(\\s*ctx\\s*\\)\\s+then\\s+return\\s*\\{\\s*handled\\s*=\\s*false\\s*\\}\\s+end\\b`);
  if (functions.length !== 1 || !match || !expression || [...code.matchAll(hookDefinitions)].length !== 1 || assignments.test(code) || !guardedHook.test(code) || expression.trim().replace(/\s+/g, " ") !== nativeBindingPredicate(binding)) {
    return err(`The matching guard in ${binding.sourceFilePath} was edited manually. Restore or detach that binding before moving or copying its item.`);
  }
  const offset = (match.index ?? 0) + match[0].indexOf(expression);
  return ok(content.slice(0, offset) + nativeBindingPredicate(updated) + content.slice(offset + expression.length));
}
