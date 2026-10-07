import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";
import { getNativeVisualGroupOptions, scriptNativeVisualGroupSchema } from "./scriptNativeVisualGroups";

export function updateNativeModelGroup(
  definition: ScriptCustomObjectDefinition, group: string, gameId: string,
): ScriptCustomObjectDefinition {
  if (definition.visual.kind !== "nativeDisplayGroup") return definition;
  const parsed = scriptNativeVisualGroupSchema.safeParse(group);
  if (!parsed.success || !getNativeVisualGroupOptions(gameId).some((option) => option.value === parsed.data)) {
    return definition;
  }
  return { ...definition, visual: { ...definition.visual, group: parsed.data } };
}
