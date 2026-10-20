import { atom } from "jotai";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

export const objectModelSnapshotsAtom = atom<Readonly<Record<string, string>>>({});

export function objectModelSnapshotKey(gameId: string, definition: ScriptCustomObjectDefinition): string {
  const visual = definition.visual;
  return visual.kind === "nativeDisplayGroup"
    ? `${gameId}:${visual.kind}:${visual.group}:${visual.modelObject}`
    : `${gameId}:${definition.id}:${visual.kind}`;
}
