import type { Game } from "@/data/globals/globals";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { getNativeModelAvailability } from "./scriptNativeModelAvailability";

export function NativeObjectAvailability({ game, definition, levelNumber, metadata }: { game: Game; definition: ScriptCustomObjectDefinition; levelNumber: number | null; metadata?: Readonly<Record<string, string>> }) {
  const availability = getNativeModelAvailability(game, definition, levelNumber, metadata);
  if (!availability) return null;
  const label = availability.status === "Available" ? "Available in this level" : availability.status === "Choose level" ? "Choose a target level" : "Unavailable in this level";
  return <details className="workbench-disclosure object-availability" data-tone={availability.status === "Unavailable" ? "warning" : undefined}>
    <summary>{label}</summary><p>{availability.detail}</p>
  </details>;
}
