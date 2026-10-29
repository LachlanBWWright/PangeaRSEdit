import { Game } from "@/data/globals/globals";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { getNativeModelAvailability } from "./scriptNativeModelAvailability";

export function isScriptGlobalModelFile(game: Game, file: string): boolean {
  return game === Game.BUGDOM ? /^global1\./i.test(file) : /^global(?:_models)?\./i.test(file);
}

export function getNativeModelGuidance(game: Game, definition: ScriptCustomObjectDefinition, levelNumber: number | null): string | null {
  return getNativeModelAvailability(game, definition, levelNumber)?.detail ?? null;
}
