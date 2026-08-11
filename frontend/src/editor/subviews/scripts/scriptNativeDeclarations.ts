import type { NativeSpawn } from "./scriptApiSchema";

function declarationName(id: string): string {
  return `NativeSpawnOptions_${id.replaceAll(/[^A-Za-z0-9_]/g, "_")}`;
}

function parameterType(values: readonly string[] | undefined): string {
  if (values === undefined || values.length === 0) return "integer";
  return values.map((value) => value.split(" ", 1)[0]).join("|");
}

function literalId(id: string): string {
  const numericId = Number(id);
  return Number.isInteger(numericId) && String(numericId) === id
    ? id
    : `"${id.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function buildNativeSpawnDeclarations(items: readonly NativeSpawn[]): string {
  return items
    .filter((item) => item.params.length > 0)
    .flatMap((item) => [
      `---@class ${declarationName(item.id)}: NativeSpawnOptions`,
      ...item.params.map((param) => `---@field ${param.name} ${parameterType(param.values)}|nil ${param.description}`),
      "",
    ])
    .join("\n");
}

export function buildNativeSpawnOverloads(items: readonly NativeSpawn[]): readonly string[] {
  return items
    .filter((item) => item.params.length > 0)
    .map((item) => `---@overload fun(id: ${literalId(item.id)}, position: Vector3, options: ${declarationName(item.id)}): ObjectHandle|nil`);
}
