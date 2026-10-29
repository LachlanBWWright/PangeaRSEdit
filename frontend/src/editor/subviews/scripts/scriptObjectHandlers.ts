import { err, ok, type Result } from "neverthrow";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";
import { updateScriptSourceContent } from "./scriptWorkspaceState";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { objectEventContextType } from "./scriptTypeDeclarations";
import { customObjectSelfType } from "./scriptObjectParameterDeclarations";
import { objectLuaLayout } from "./scriptObjectLuaLayout";

export function addObjectHandler(state: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition, handler: string): Result<ScriptWorkspaceState, string> {
  const file = state.sourceFiles[definition.sourceFilePath];
  if (!file) return err("Restore the object's source before adding an event.");
  const event = SCRIPTING_CONTRACT.objectEvents.find((entry) => entry.handler === handler);
  if (!event) return err("Choose a supported object event.");
  const layout = objectLuaLayout(file.content, definition.exportName);
  if (layout.isErr()) return err(layout.error);
  if (layout.value.handlers.has(handler)) return ok(state);
  const { position, variable } = layout.value;
  const context = objectEventContextType(event?.id ?? "");
  const declaration = variable ? `function ${variable}.${handler}` : `${handler} = function`;
  const content = `${file.content.slice(0, position)}\n\n---@param self ${customObjectSelfType(definition)}\n---@param ctx ${context}\n${declaration}(self, ctx)\n\nend${variable ? "" : ","}\n${file.content.slice(position)}`;
  return ok(updateScriptSourceContent(state, file.path, content));
}
