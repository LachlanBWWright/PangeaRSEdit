import type { Game } from "@/data/globals/globals";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { getNativeModelAvailability } from "./scriptNativeModelAvailability";

export function NativeObjectAvailability({ game, definition, levelNumber, metadata }: { game: Game; definition: ScriptCustomObjectDefinition; levelNumber: number | null; metadata?: Readonly<Record<string, string>> }) {
  const availability = getNativeModelAvailability(game, definition, levelNumber, metadata);
  return availability ? <p className="workbench-notice" data-tone={availability.status === "Unavailable" ? "warning" : undefined} role="status"><strong>{availability.status}:</strong> {availability.detail}</p> : null;
}
