import type { ScriptInspectorSnapshot } from "@pangea/desktop-contracts";
import type { ScriptWorkspaceState } from "./subviews/scripts/scriptWorkspaceStateTypes";

export interface ScriptAttribution {
  callback: string;
  source: string;
  line: number;
  object: { id: number; generation: number } | null;
}

export type DiagnosticTarget<T> = { target: T; unavailable?: never } | { target?: never; unavailable: string };
export interface ScriptSourceLocation { path: string; line: number }
export interface DiagnosticNavigation {
  source: (entry: ScriptAttribution) => DiagnosticTarget<ScriptSourceLocation>;
  placement: (handle: NonNullable<ScriptAttribution["object"]>) => DiagnosticTarget<string>;
  openSource: (location: ScriptSourceLocation) => void;
  selectPlacement: (id: string) => void;
}

export function inspectorNavigationSnapshot(snapshot: ScriptInspectorSnapshot | null, objects: ScriptInspectorSnapshot["objects"]): ScriptInspectorSnapshot | null {
  if (!snapshot) return null;
  const handles = new Set(objects.map((object) => `${object.id}:${object.generation}`));
  return { ...snapshot, objects: [...snapshot.objects.filter((object) => !handles.has(`${object.id}:${object.generation}`)), ...objects] };
}

export function diagnosticSourceLocation(workspace: ScriptWorkspaceState, source: string, line: number): DiagnosticTarget<ScriptSourceLocation> {
  const path = source.replace(/^@/, "").replaceAll("\\", "/").replace(/^.*?(?=Data\/Scripts\/)/, "");
  const compiled = workspace.compiledFiles[path];
  const sourcePath = compiled?.sourcePath ?? path;
  const file = workspace.sourceFiles[sourcePath];
  if (!file || file.readOnly) return { unavailable: "No editable source matches this runtime location. Generated entry code and missing sources cannot be opened here." };
  // Modules are copied verbatim; generated dispatcher lines do not map to user code.
  if (compiled && compiled.content !== file.content) return { target: { path: sourcePath, line: 0 } };
  return { target: { path: sourcePath, line: Number.isSafeInteger(line) && line > 0 ? line : 0 } };
}

export function diagnosticPlacement(workspace: ScriptWorkspaceState, snapshot: ScriptInspectorSnapshot | null, handle: NonNullable<ScriptAttribution["object"]>): DiagnosticTarget<string> {
  const live = snapshot?.objects.find((object) => object.id === handle.id && object.generation === handle.generation);
  if (!live) return { unavailable: "This handle is no longer live or is outside the inspector snapshot." };
  const id = live.state.__pangeaPlacementId;
  const level = live.state.__pangeaPlacementLevel;
  if (!id || !level) return { unavailable: "No authored placement identity is available for this native, dynamic, or older runtime object." };
  if (level !== workspace.context.levelKey) return { unavailable: "Open the object's level before selecting its placement." };
  const definition = live.definition || live.type;
  const placement = workspace.levels[level]?.customPlacements.find((entry) => entry.id === id && entry.objectId === definition);
  if (!placement) return { unavailable: "The originating placement is missing or has changed in this workspace." };
  return { target: placement.id };
}
