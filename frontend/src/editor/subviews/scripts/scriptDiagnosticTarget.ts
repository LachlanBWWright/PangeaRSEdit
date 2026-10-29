import type { ScriptDiagnostic, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export type ScriptDiagnosticTarget =
  | { kind: "source"; path: string; line: number; column: number }
  | { kind: "definition"; objectId: string }
  | { kind: "placement"; placementId: string }
  | { kind: "level-events" };

export function getScriptDiagnosticTarget(workspace: ScriptWorkspaceState, diagnostic: ScriptDiagnostic): ScriptDiagnosticTarget | null {
  const source = workspace.compiledFiles[diagnostic.filePath]?.sourcePath ?? diagnostic.filePath;
  if (workspace.sourceFiles[source] || workspace.compiledFiles[source]) {
    return { kind: "source", path: source, line: diagnostic.line, column: diagnostic.column };
  }
  const placements = workspace.levels[workspace.context.levelKey]?.customPlacements ?? [];
  const placementMatches = placements.filter((placement) => diagnostic.message.includes(`'${placement.id}'`));
  const placement = placementMatches.length === 1 ? placementMatches[0] : undefined;
  if (placement) return { kind: "placement", placementId: placement.id };
  const objectMatches = workspace.customObjects.filter((object) => diagnostic.message.includes(`'${object.id}'`));
  const object = objectMatches.length === 1 ? objectMatches[0] : undefined;
  if (object) return { kind: "definition", objectId: object.id };
  if (diagnostic.filePath.endsWith("/objects.json") && workspace.customObjects.length === 1) {
    const definition = workspace.customObjects[0];
    if (definition) return { kind: "definition", objectId: definition.id };
  }
  if (diagnostic.filePath.includes("/bindings/") || diagnostic.filePath.endsWith("/levels.json")) return { kind: "level-events" };
  return null;
}
