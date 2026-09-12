import { err, ok, type Result } from "neverthrow";

export interface MigratedLegacySource {
  readonly path: string;
  readonly content: string;
  readonly warnings: readonly string[];
}

function luaPath(path: string): string {
  return path.replace(/\.(?:tsx?|jsx?)$/i, ".lua");
}

function translateBody(body: string): Result<string, string> {
  if (/[{}]|=>|\b(?:const|let|var)\b/.test(body)) {
    return err("contains nested blocks, arrow functions, or local declarations");
  }
  const translated = body
    .replace(/console\.log\s*\(/g, "pangea.log.info(")
    .replace(/\btrue\b/g, "true")
    .replace(/\bfalse\b/g, "false")
    .replace(/\bnull\b/g, "nil")
    .replace(/===/g, "==")
    .replace(/!==/g, "~=")
    .replace(/&&/g, "and")
    .replace(/\|\|/g, "or")
    .replace(/;\s*/g, "\n  ")
    .trim();
  return ok(translated.length === 0 ? "" : `  ${translated}`);
}

function migrateFunctionSource(path: string, source: string): Result<MigratedLegacySource, string> {
  const functions: string[] = [];
  const warnings: string[] = [];
  const functionPattern = /(?:export\s+)?function\s+(on[A-Z]\w*)\s*\(([^)]*)\)(?:\s*:\s*[^\s{]+)?\s*\{([^{}]*)\}/g;
  const assignmentPattern = /(?:exports|module)\.(on[A-Z]\w*)\s*=\s*function\s*\(([^)]*)\)\s*\{([^{}]*)\}\s*;?/g;

  const collect = (match: RegExpExecArray): Result<true, string> => {
    const hook = match[1];
    const parameters = (match[2] ?? "")
      .split(",")
      .map((parameter) => parameter.trim().replace(/\?.*$/, "").replace(/\s*:\s*.*$/, ""))
      .filter((parameter) => parameter.length > 0)
      .join(", ");
    const bodyResult = translateBody(match[3] ?? "");
    if (bodyResult.isErr()) return err(`${hook}: ${bodyResult.error}`);
    functions.push(`function module.${hook}(${parameters})\n${bodyResult.value}\nend`);
    return ok(true);
  };

  let match: RegExpExecArray | null;
  while ((match = functionPattern.exec(source)) !== null) {
    const result = collect(match);
    if (result.isErr()) return err(`${path}: ${result.error}`);
  }
  while ((match = assignmentPattern.exec(source)) !== null) {
    const result = collect(match);
    if (result.isErr()) return err(`${path}: ${result.error}`);
  }
  if (functions.length === 0) {
    return err(`${path}: no supported exported callback functions were found`);
  }
  if (/import\s+|require\s*\(|class\s+|interface\s+/.test(source)) {
    warnings.push(`${path}: imports, classes, and type declarations were not migrated`);
  }
  return ok({
    path: luaPath(path),
    content: ["-- Migrated from the legacy TypeScript/JavaScript scripting API.", "local module = {}", ...functions, "return module", ""].join("\n"),
    warnings,
  });
}

export function migrateLegacyScriptSource(
  path: string,
  source: string,
): Result<MigratedLegacySource, string> {
  if (!/\.(?:tsx?|jsx?)$/i.test(path)) {
    return err(`Unsupported legacy source extension: ${path}`);
  }
  return migrateFunctionSource(path, source);
}
