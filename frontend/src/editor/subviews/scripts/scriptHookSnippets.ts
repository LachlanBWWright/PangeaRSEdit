import { SCRIPTING_CONTRACT } from "./scriptContract";
import type { ScriptHookId } from "./scriptWorkspaceState";
import { objectEventContextType } from "./scriptTypeDeclarations";

export interface ScriptHookSnippet {
  name: string;
  insertText: string;
}

export function buildModuleHookSnippets(source: string, hooks: readonly ScriptHookId[]): readonly ScriptHookSnippet[] {
  const objectExport = /return\s*\{\s*[A-Za-z_]\w*\s*=\s*([A-Za-z_]\w*)\s*\}\s*$/.exec(source)?.[1];
  if (objectExport) return SCRIPTING_CONTRACT.objectEvents.map((event) => ({
    name: event.handler,
    insertText: `---@param self ObjectBehaviorSelf\n---@param ctx ${objectEventContextType(event.id)}\nfunction ${objectExport}.${event.handler}(self, ctx)\n  $0\nend\n`,
  }));
  const moduleExport = /\breturn\s+([A-Za-z_]\w*)\s*$/.exec(source)?.[1];
  if (!moduleExport) return [];
  return hooks.map((hookId) => {
    const metadata = SCRIPTING_CONTRACT.api.hooks.find((hook) => hook.name === hookId);
    const body = metadata?.returnType.includes("Result") && hookId !== "onDamage" ? "return { handled = false }" : "$0";
    return { name: hookId, insertText: `---@param ctx ${metadata?.contextType ?? "LevelContext"}\nfunction ${moduleExport}.${hookId}(ctx)\n  ${body}\nend\n` };
  });
}
