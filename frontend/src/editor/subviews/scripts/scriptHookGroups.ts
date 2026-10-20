import type { ScriptHookId } from "./scriptWorkspaceState";

export function scriptHookGroup(hook: ScriptHookId): string {
  if (["onDamage", "onDamageApplied", "onDeath", "onWeaponHit"].includes(hook)) return "Combat";
  if (["onPickupCollected", "onTriggerEnter", "onDialogueResult"].includes(hook)) return "Interaction";
  if (["onTerrainItem", "onSplineItem", "onMapItem", "onObjectFrame", "onPlayerSpawn", "onPlayerRespawn"].includes(hook)) return "Objects and players";
  if (["onCheckpointReached", "onLapComplete", "onRaceFinish", "onObjectiveComplete"].includes(hook)) return "Progression";
  if (hook === "onSave" || hook === "onLoad") return "Save and load";
  return "Lifecycle";
}

export function scriptHookLabel(hook: string): string {
  return hook.replace(/^on/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase());
}
