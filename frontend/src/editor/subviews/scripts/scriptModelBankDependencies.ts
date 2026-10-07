import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";
import { getNativeVisualGroupOptions } from "./scriptNativeVisualGroups";

const activeGroups = new Set(["global", "global2", "levelSpecific", "levelSpecific2", "foliage", "weapons"]);

export function getScriptModelBankDependencies(
  gameId: string,
  visuals: readonly ScriptCustomObjectDefinition["visual"][],
): { kind: string; id: string }[] {
  const available = new Set(getNativeVisualGroupOptions(gameId).map((option) => option.value));
  const banks = new Set<string>();
  for (const visual of visuals) {
    if (visual.kind !== "nativeDisplayGroup" || activeGroups.has(visual.group)) continue;
    if (available.has(visual.group)) banks.add(visual.group);
  }
  return [...banks].map((id) => ({ kind: "modelGroup", id }));
}
