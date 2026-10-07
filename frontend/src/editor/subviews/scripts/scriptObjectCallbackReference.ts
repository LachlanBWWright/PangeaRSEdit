import { SCRIPTING_CONTRACT } from "./scriptContract";
import type { ScriptHookId } from "./scriptWorkspaceStateTypes";

export interface ObjectCallbackReference {
  readonly name: string;
  readonly description: string;
  readonly contextType: string;
  readonly returnType: string;
  readonly returnDescription: string;
  readonly fields: Readonly<Record<string, string>>;
}

const lifecycleDescriptions: Readonly<Record<string, string>> = {
  spawn: "Initialize the new item, its health and persistent per-object state.",
  update: "Update motion and behavior each frame. ctx.deltaSeconds is elapsed frame time.",
  triggerEnter: "Contact-enter lifecycle notification. Return values are ignored; use onTrigger for contact effects and solidity.",
  triggerStay: "Continuing-contact lifecycle notification. Return values are ignored; use onTrigger for contact effects and solidity.",
  triggerExit: "Contact-exit lifecycle notification.",
  animationEvent: "Handle an animation marker. ctx.eventValue identifies the marker.",
  animationComplete: "Handle the end of a non-looping animation; there is no marker value.",
  activate: "Handle item activation when dispatched by the game adapter.",
  deactivate: "Handle deactivation. Owned resources are released and per-object state is cleared.",
  streamIn: "Handle an item streaming into the active area when dispatched by the game adapter.",
  streamOut: "Handle streaming out. Owned resources and state are released; the handle becomes invalid.",
  checkpointReset: "Handle checkpoint reset. Owned resources are released; per-object state is preserved.",
  death: "Handle this item's death lifecycle event when dispatched by the game adapter.",
  destroy: "Handle destruction. Owned resources and state are released; the handle becomes invalid.",
};

const frameFields = { object: "ObjectHandle", objectType: "ObjectTypeId", deltaSeconds: "number", position: "Vector3", event: "string", other: "ObjectHandle|nil", sideBits: "integer" };

const gameplayCallbacks: readonly (ObjectCallbackReference & { readonly hook: ScriptHookId })[] = [
  { name: "onTrigger", hook: "onTriggerEnter", description: "Decide contact effects and whether the item blocks the other object.", contextType: "TriggerContext", returnType: "TriggerResult|nil", returnDescription: "handled, solid, deleteSelf, deleteOther, damagePlayer, healthDelta and scoreDelta. Return nil to keep the default contact behavior.", fields: { self: "ObjectHandle", other: "ObjectHandle|nil", playerNum: "integer", position: "Vector3", sideBits: "integer" } },
  { name: "onPickupCollected", hook: "onPickupCollected", description: "Apply the effect when this pickup is collected.", contextType: "PickupContext", returnType: "PickupResult|nil", returnDescription: "handled, consumePickup, healthDelta and scoreDelta. Return nil to keep the default pickup behavior.", fields: { pickup: "ObjectHandle", player: "ObjectHandle|nil", playerNum: "integer", position: "Vector3" } },
  { name: "onWeaponHit", hook: "onWeaponHit", description: "Respond when a weapon or projectile hits this item.", contextType: "WeaponHitContext", returnType: "WeaponHitResult|nil", returnDescription: "handled, applyDamage, damage, destroyTarget and scoreDelta. Supported effects depend on the game's native damage path.", fields: { weapon: "ObjectHandle|nil", target: "ObjectHandle|nil", playerNum: "integer", damage: "number" } },
  { name: "onDamage", hook: "onDamage", description: "Adjust or prevent incoming damage to this item before the adapter applies it.", contextType: "DamageContext", returnType: "DamageResult|nil", returnDescription: "handled, applyDamage and damage. Return nil to leave damage unchanged. Effective damage must be finite and nonnegative.", fields: { target: "ObjectHandle", source: "ObjectHandle|nil", damage: "number", cause: "integer", playerNum: "integer", position: "Vector3" } },
  { name: "onDamageApplied", hook: "onDamageApplied", description: "Respond after the adapter has applied damage to this item.", contextType: "DamageContext", returnType: "nil", returnDescription: "No return value; read the item's health through pangea.object.health(self.handle).", fields: { target: "ObjectHandle", source: "ObjectHandle|nil", damage: "number", cause: "integer", playerNum: "integer", position: "Vector3" } },
];

export function getObjectCallbackReferences(supportedHooks: readonly ScriptHookId[], search: string): readonly ObjectCallbackReference[] {
  const lifecycle = SCRIPTING_CONTRACT.objectEvents.map((event): ObjectCallbackReference => ({
    name: event.handler,
    description: lifecycleDescriptions[event.id] ?? `Handle the ${event.id} item lifecycle event.`,
    contextType: event.id === "animationEvent" ? "AnimationMarkerObjectFrameContext" : event.id === "animationComplete" ? "AnimationCompleteObjectFrameContext" : "ObjectFrameContext",
    returnType: "nil",
    returnDescription: "No return value. Use pangea.object commands to change the item.",
    fields: event.id === "animationEvent" ? { ...frameFields, eventValue: "integer" } : frameFields,
  }));
  const normalized = search.trim().toLowerCase();
  return [...gameplayCallbacks.filter((entry) => supportedHooks.includes(entry.hook)), ...lifecycle].filter((entry) => `${entry.name} ${entry.description} ${entry.contextType} ${entry.returnType} ${entry.returnDescription} ${Object.keys(entry.fields).join(" ")}`.toLowerCase().includes(normalized));
}
