import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";
import { getNativeVisualGroupOptions } from "./scriptNativeVisualGroups";
import { updateNativeModelGroup } from "./scriptNativeVisualEdits";

interface ScriptNativeModelGroupSelectProps {
  readonly definition: ScriptCustomObjectDefinition;
  readonly gameId: string;
  readonly onUpdate: (definition: ScriptCustomObjectDefinition) => void;
}

export function ScriptNativeModelGroupSelect({ definition, gameId, onUpdate }: ScriptNativeModelGroupSelectProps) {
  if (definition.visual.kind !== "nativeDisplayGroup") return null;
  return (
    <Select value={definition.visual.group} onValueChange={(group) => onUpdate(updateNativeModelGroup(definition, group, gameId))}>
      <SelectTrigger aria-label={`${definition.label} model group`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {getNativeVisualGroupOptions(gameId).map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
