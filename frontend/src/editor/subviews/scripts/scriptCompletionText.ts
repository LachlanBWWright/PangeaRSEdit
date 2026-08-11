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

export function buildNativeIdSnippet(nativeSpawnIds: readonly string[]): string {
  return nativeSpawnIds.length === 0
    ? "${1:native-id}"
    : `\${1|${nativeSpawnIds.join(",")}|}`;
}
