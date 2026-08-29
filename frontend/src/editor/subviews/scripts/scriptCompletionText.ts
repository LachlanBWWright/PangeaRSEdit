import type { ApiFunction } from "./scriptApiSchema";

function luaFieldType(field: ApiFunction["parameters"][number]): string {
  if (field.type === "stringUnion" && field.unionValues !== undefined) {
    return field.unionValues.map((value) => JSON.stringify(value)).join("|");
  }
  const types: Record<ApiFunction["parameters"][number]["type"], string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    vector2: "Vector2",
    vector3: "Vector3",
    objectHandle: "ObjectHandle",
    stringUnion: "string",
    table: "table",
    function: "function",
    unknown: "unknown",
  };
  return types[field.type];
}

export function buildApiSignature(api: ApiFunction): string {
  const parameters = api.parameters
    .map((parameter) => `${parameter.name}: ${luaFieldType(parameter)}${parameter.optional ? "?" : ""}`)
    .join(", ");
  return `${api.name}(${parameters}): ${api.returnType}`;
}

export function getContextualApiName(
  linePrefix: string,
  qualifiedName: string,
): string {
  const parts = qualifiedName.split(".");
  const namespace = parts[1];
  if (namespace !== undefined && linePrefix.endsWith(`pangea.${namespace}.`)) {
    return parts.slice(2).join(".");
  }
  if (linePrefix.endsWith("pangea.")) {
    return parts.slice(1).join(".");
  }
  return qualifiedName;
}

export function buildApiCompletionInsertText(
  api: ApiFunction,
  contextualApiName: (qualifiedName: string) => string,
): string {
  const parameters = api.parameters
    .map((parameter, index) => `\${${index + 1}:${parameter.name}}`)
    .join(", ");
  return `${contextualApiName(api.name)}(${parameters})`;
}

export function buildNativeIdSnippet(nativeSpawnIds: readonly string[]): string {
  return nativeSpawnIds.length === 0
    ? "${1:native-id}"
    : `\${1|${nativeSpawnIds.map(nativeIdInsertText).join(",")}|}`;
}

export function nativeIdInsertText(id: string): string {
  const numericId = Number(id);
  if (Number.isInteger(numericId) && String(numericId) === id) return id;
  return `"${id.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
