import { err, ok, type Result } from "neverthrow";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";
import { updateScriptSourceContent } from "./scriptWorkspaceState";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { objectEventContextType } from "./scriptTypeDeclarations";

export function addObjectHandler(state: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition, handler: string): Result<ScriptWorkspaceState, string> {
  const file = state.sourceFiles[definition.sourceFilePath];
  if (!file) return err("Restore the object's source before adding an event.");
  if (file.content.includes(`.${handler}`)) return ok(state);
  const exportPattern = new RegExp(`\\b${definition.exportName}\\s*=\\s*([a-zA-Z_][a-zA-Z0-9_]*)`);
  const variable = file.content.match(exportPattern)?.[1];
  const position = file.content.lastIndexOf("\nreturn ");
  if (!variable || position < 0) return err("This source uses a custom export layout. Add the callback directly in Lua.");
  const event = SCRIPTING_CONTRACT.objectEvents.find((entry) => entry.handler === handler);
  const context = objectEventContextType(event?.id ?? "");
  const content = `${file.content.slice(0, position)}\n\n---@param self ObjectBehaviorSelf\n---@param ctx ${context}\nfunction ${variable}.${handler}(self, ctx)\n\nend\n${file.content.slice(position)}`;
  return ok(updateScriptSourceContent(state, file.path, content));
}
