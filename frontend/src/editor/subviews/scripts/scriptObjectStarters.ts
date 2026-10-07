import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { addBehaviorDefinition, createCustomObjectFromBehavior, updateCustomObjectDefinition, type ScriptWorkspaceState, type ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { buildGeneratedCustomObjectId } from "./scriptWorkspaceHelpers";
import { CUSTOM_OBJECT_EXPORT_PLACEHOLDER } from "./scriptCustomObjectTemplate";

export const objectStarterSchema = z.enum(["decoration", "trigger", "pickup", "enemy", "platform"]);
export type ObjectStarter = z.infer<typeof objectStarterSchema>;
export const OBJECT_STARTERS: readonly { id: ObjectStarter; label: string; description: string }[] = [
  { id: "decoration", label: "Decoration", description: "A scripted object without collision." },
  { id: "trigger", label: "Contact trigger", description: "Runs an action when another object touches it." },
  { id: "pickup", label: "Health pickup", description: "Heals the player and consumes the pickup." },
  { id: "enemy", label: "Enemy", description: "Starts with health and supports script-controlled damage." },
  { id: "platform", label: "Moving platform", description: "Moves back and forth with a platform collision surface." },
];

function starterSource(starter: ObjectStarter): string {
  const callbacks = {
    decoration: "function item.onUpdate(self, ctx)\nend",
    trigger: "function item.onTrigger(self, ctx)\n  return { handled = true, solid = false }\nend",
    pickup: "function item.onPickupCollected(self, ctx)\n  return { handled = true, consumePickup = true, healthDelta = 0.25 }\nend",
    enemy: "function item.onSpawn(self, ctx)\n  pangea.object.setHealth(self.handle, 1)\nend\n\nfunction item.onDamage(self, ctx)\n  return nil\nend",
    platform: "function item.onUpdate(self, ctx)\n  local state = pangea.object.state(self.handle)\n  state.elapsed = (state.elapsed or 0) + ctx.deltaSeconds\n  local direction = math.floor(state.elapsed / 3) % 2 == 0 and 1 or -1\n  pangea.object.setVelocity(self.handle, { x = 30 * direction, y = 0, z = 0 })\nend",
  };
  return `local item = {}\n\n${callbacks[starter]}\n\nreturn { ${CUSTOM_OBJECT_EXPORT_PLACEHOLDER} = item }\n`;
}

export function createCustomObjectFromStarter(state: ScriptWorkspaceState, starter: ObjectStarter, label: string): Result<ScriptWorkspaceState, string> {
  const parsed = z.string().trim().min(1).safeParse(label);
  if (!parsed.success) return err("Name the item before creating it.");
  const objectId = buildGeneratedCustomObjectId(parsed.data, state.customObjects.map((definition) => definition.id));
  const behaviorId = `starter.${starter}`;
  const option = OBJECT_STARTERS.find((candidate) => candidate.id === starter);
  if (!option) return err("Choose a supported item starter.");
  const withBehavior = state.behaviorCatalog.some((behavior) => behavior.id === behaviorId) ? state : addBehaviorDefinition(state, {
    id: behaviorId, label: option.label, description: option.description,
    target: "customObject", hooks: [], sourceFilePath: `Data/Scripts/src/starters/${starter}.lua`,
    tags: [], sourceTemplate: starterSource(starter),
  });
  const next = createCustomObjectFromBehavior(withBehavior, behaviorId, objectId, parsed.data);
  const definition = next.customObjects.find((candidate) => candidate.id === objectId);
  if (!definition) return err("The starter could not create an item definition.");
  const collision: ScriptCustomObjectDefinition["collision"] = starter === "decoration" ? { kind: "none" } : {
    kind: "preset",
    preset: starter === "trigger" ? "triggerBox" : starter,
    bounds: { width: 40, height: 40, depth: 40 },
  };
  return ok(updateCustomObjectDefinition(next, { ...definition, collision }));
}
