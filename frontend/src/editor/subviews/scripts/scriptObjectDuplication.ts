import { err, ok, type Result } from "neverthrow";
import { buildGeneratedCustomObjectId } from "./scriptWorkspaceHelpers";
import { upsertScriptSourceFile, type ScriptWorkspaceState } from "./scriptWorkspaceState";

function luaString(value: string): string {
  return `"${Array.from(new TextEncoder().encode(value), (byte) => `\\${String(byte).padStart(3, "0")}`).join("")}"`;
}

export function aliasSourceExport(source: string, oldExport: string, newExport: string): string {
  return `local copiedExports = (function(...)\n${source}\nend)(...)\nreturn { [${luaString(newExport)}] = copiedExports[${luaString(oldExport)}] }\n`;
}

export function duplicateScriptObject(state: ScriptWorkspaceState, objectId: string): Result<{ state: ScriptWorkspaceState; id: string }, string> {
  const original = state.customObjects.find((object) => object.id === objectId);
  if (!original) return err("Choose an object to duplicate.");
  const source = state.sourceFiles[original.sourceFilePath];
  if (!source) return err(`Object source is missing: ${original.sourceFilePath}`);
  const label = `${original.label} copy`;
  const occupied = state.customObjects.map((object) => object.id);
  let id = buildGeneratedCustomObjectId(label, occupied);
  let exportName = id.replace(/[^a-zA-Z0-9_]/g, "_");
  let sourceFilePath = `Data/Scripts/src/objects/${id.replaceAll(".", "-")}.lua`;
  while (state.sourceFiles[sourceFilePath] || state.customObjects.some((object) => object.exportName === exportName)) {
    occupied.push(id);
    id = buildGeneratedCustomObjectId(label, occupied);
    exportName = id.replace(/[^a-zA-Z0-9_]/g, "_");
    sourceFilePath = `Data/Scripts/src/objects/${id.replaceAll(".", "-")}.lua`;
  }
  const definition = { ...original, id, label, exportName, sourceFilePath };
  const next = upsertScriptSourceFile({ ...state, customObjects: [...state.customObjects, definition] }, sourceFilePath, aliasSourceExport(source.content, original.exportName, exportName), "generated-assignment", id);
  return ok({ state: next, id });
}
