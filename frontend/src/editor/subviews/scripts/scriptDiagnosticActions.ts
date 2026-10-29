import type { ScriptDiagnosticTarget } from "./scriptDiagnosticTarget";

export interface ScriptDiagnosticActions {
  openSource: (location: { path: string; line: number; column: number }) => void;
  openDefinition: (objectId: string) => void;
  inspectPlacement: (placementId: string) => void;
  openEvents: () => void;
}

export function openScriptDiagnostic(target: ScriptDiagnosticTarget, actions: ScriptDiagnosticActions) {
  switch (target.kind) {
    case "source": return actions.openSource(target);
    case "definition": return actions.openDefinition(target.objectId);
    case "placement": return actions.inspectPlacement(target.placementId);
    case "level-events": return actions.openEvents();
  }
}
