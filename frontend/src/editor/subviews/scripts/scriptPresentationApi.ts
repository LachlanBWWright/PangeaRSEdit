import type { ApiFunction } from "./scriptApiSchema";

export function appendPresentationHook(hooks: string[]): string[] {
  return hooks.includes("onDialogueResult") ? hooks : ["onDialogueResult", ...hooks];
}

const options = { name: "options", type: "table", optional: true } satisfies ApiFunction["parameters"][number];
const handle = { name: "handle", type: "table" } satisfies ApiFunction["parameters"][number];

export const PRESENTATION_APIS: ApiFunction[] = [
  { name: "pangea.ui.message", description: "Queues a bounded message in the native game HUD.", parameters: [{ name: "text", type: "string" }, options], returnType: "PresentationResult" },
  { name: "pangea.ui.objective", description: "Creates or updates a persistent named objective with optional progress.", parameters: [{ name: "id", type: "string" }, { name: "options", type: "table" }], returnType: "PresentationResult" },
  { name: "pangea.ui.remove", description: "Removes a generation-checked script presentation resource.", parameters: [handle], returnType: "PresentationResult" },
  { name: "pangea.ui.isActive", description: "Checks whether a presentation resource is still active.", parameters: [handle], returnType: "boolean" },
  { name: "pangea.dialogue.define", description: "Defines up to sixteen dialogue nodes with named choices and optional native voices.", parameters: [{ name: "id", type: "string" }, { name: "nodes", type: "table" }], returnType: "PresentationResult" },
  { name: "pangea.dialogue.start", description: "Starts a nonmodal native conversation; completion and choice results reach onDialogueResult.", parameters: [{ name: "id", type: "string" }, options], returnType: "PresentationResult" },
  { name: "pangea.dialogue.cancel", description: "Cancels a conversation and stops its owned voice.", parameters: [handle], returnType: "PresentationResult" },
  { name: "pangea.dialogue.isActive", description: "Checks whether a conversation is active.", parameters: [handle], returnType: "boolean" },
  { name: "pangea.audio.play", description: "Plays a named native sound; positional support is reported per game.", parameters: [{ name: "id", type: "string" }, options], returnType: "PresentationResult" },
  { name: "pangea.audio.stop", description: "Stops a script-owned sound without stopping a native sound that reused its channel.", parameters: [handle], returnType: "PresentationResult" },
  { name: "pangea.audio.isActive", description: "Checks whether an owned sound remains active.", parameters: [handle], returnType: "boolean" },
  { name: "pangea.effects.burst", description: "Emits a bounded cosmetic native effect without gameplay damage.", parameters: [{ name: "id", type: "string" }, options], returnType: "PresentationResult" },
  { name: "pangea.effects.attach", description: "Creates an object-owned cosmetic emitter, released when its owner disappears.", parameters: [{ name: "id", type: "string" }, { name: "options", type: "table" }], returnType: "PresentationResult" },
  { name: "pangea.effects.stop", description: "Stops an attached cosmetic emitter.", parameters: [handle], returnType: "PresentationResult" },
];
