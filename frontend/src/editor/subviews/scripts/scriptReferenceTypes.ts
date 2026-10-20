import { buildScriptTypeDeclarationFiles, type ScriptTypeWorkspace } from "./scriptTypeDeclarations";

export interface ScriptReferenceType {
  name: string;
  parent: string | null;
  fields: string[];
  alias: string | null;
}

export function buildScriptReferenceTypes(workspace: ScriptTypeWorkspace): ReadonlyMap<string, ScriptReferenceType> {
  const types = new Map<string, ScriptReferenceType>();
  for (const file of buildScriptTypeDeclarationFiles(workspace)) {
    let current: ScriptReferenceType | null = null;
    let activeAlias: ScriptReferenceType | null = null;
    for (const line of file.content.split("\n")) {
      const declaration = /^---@class\s+(\w+)(?:\s*:\s*(\w+))?/.exec(line);
      if (declaration?.[1]) {
        activeAlias = null;
        current = { name: declaration[1], parent: declaration[2] ?? null, fields: [], alias: null };
        types.set(current.name, current);
      } else if (line.startsWith("---@field ") && current) {
        current.fields.push(line.slice("---@field ".length));
      } else if (line.startsWith("---@alias ")) {
        const alias = /^---@alias\s+(\w+)\s*(.*)/.exec(line);
        current = null;
        if (alias?.[1]) {
          activeAlias = { name: alias[1], parent: null, fields: [], alias: alias[2] ?? "" };
          types.set(alias[1], activeAlias);
        }
      } else if (line.startsWith("---|") && activeAlias) {
        activeAlias.alias = `${activeAlias.alias}\n${line.slice(3)}`;
      }
    }
  }
  return types;
}

export function referenceTypeFields(types: ReadonlyMap<string, ScriptReferenceType>, name: string, visited: ReadonlySet<string> = new Set()): readonly string[] {
  if (visited.has(name)) return [];
  const entry = types.get(name);
  if (!entry) return [];
  const next = new Set([...visited, name]);
  const fields = [...(entry.parent ? referenceTypeFields(types, entry.parent, next) : []), ...entry.fields];
  return [...new Map(fields.map((field) => [field.split(" ")[0] ?? field, field])).values()];
}
