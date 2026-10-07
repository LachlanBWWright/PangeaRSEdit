import { SCRIPTING_CONTRACT } from "./scriptContract";
import { scriptHookIdSchema, type ScriptHookId } from "./scriptWorkspaceStateTypes";

export function getScriptGameHooks(gameId: string): readonly ScriptHookId[] {
  const game = SCRIPTING_CONTRACT.api.games.find((candidate) => candidate.gameId === gameId);
  if (!game) return [];
  return game.supportedHooks.flatMap((hook) => {
    const parsed = scriptHookIdSchema.safeParse(hook);
    return parsed.success ? [parsed.data] : [];
  });
}
