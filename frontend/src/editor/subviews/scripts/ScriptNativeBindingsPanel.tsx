import {
  MapItemScriptSection,
  SplineItemScriptSection,
  TerrainItemScriptSection,
} from "./ScriptBindingSection";
import { ScriptAssignmentCard } from "./ScriptSharedComponents";
import type {
  ScriptMapItemBinding,
  ScriptMapItemSignature,
  ScriptSplineBinding,
  ScriptSplineBindingSignature,
  ScriptTargetKind,
  ScriptTerrainBinding,
  ScriptTerrainBindingSignature,
} from "./scriptWorkspaceState";
import { MenuEmptyState } from "../MenuEmptyState";
import { ScriptFieldHelpTooltip } from "./ScriptFieldHelpTooltip";

interface ScriptNativeBindingsPanelProps {
  selectionTargetKind: ScriptTargetKind | null;
  selectionLabel: string;
  terrainSelectionSignature: ScriptTerrainBindingSignature | null;
  splineSelectionSignature: ScriptSplineBindingSignature | null;
  mapItemSelectionSignature: ScriptMapItemSignature | null;
  terrainBindings: readonly ScriptTerrainBinding[];
  splineBindings: readonly ScriptSplineBinding[];
  mapItemBindings: readonly ScriptMapItemBinding[];
  onRemoveBinding: (bindingId: string) => void;
}

export function ScriptNativeBindingsPanel({
  selectionTargetKind,
  selectionLabel,
  terrainSelectionSignature,
  splineSelectionSignature,
  mapItemSelectionSignature,
  terrainBindings,
  splineBindings,
  mapItemBindings,
  onRemoveBinding,
}: ScriptNativeBindingsPanelProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-white">Native Item Bindings</h3>
        <ScriptFieldHelpTooltip label="About native item bindings">
          Bindings target the selected native item using generated predicate guards.
        </ScriptFieldHelpTooltip>
      </div>
      <div className="grid gap-3">
        {selectionTargetKind === "terrainItem" && terrainSelectionSignature ? (
          <TerrainItemScriptSection
            selectionLabel={selectionLabel}
            signature={terrainSelectionSignature}
          />
        ) : null}
        {selectionTargetKind === "splineItem" && splineSelectionSignature ? (
          <SplineItemScriptSection
            selectionLabel={selectionLabel}
            signature={splineSelectionSignature}
          />
        ) : null}
        {selectionTargetKind === "mapItem" && mapItemSelectionSignature ? (
          <MapItemScriptSection
            selectionLabel={selectionLabel}
            signature={mapItemSelectionSignature}
          />
        ) : null}
        {selectionTargetKind === null ? (
          <MenuEmptyState
            title="No Item Selected"
            description="Select a terrain item, spline item, or Mighty Mike item to attach a script."
            compact
          />
        ) : null}

        {terrainBindings.map((binding) => (
          <ScriptAssignmentCard
            key={binding.id}
            title={binding.label}
            subtitle={`Terrain item type ${String(binding.signature.itemType)}`}
            sourceFilePath={binding.sourceFilePath}
            tags={binding.tags}
            compatibility={binding.compatibility}
            onRemove={() => onRemoveBinding(binding.id)}
          />
        ))}
        {splineBindings.map((binding) => (
          <ScriptAssignmentCard
            key={binding.id}
            title={binding.label}
            subtitle={`Spline ${String(binding.signature.splineNum)} at ${String(binding.signature.placement)}`}
            sourceFilePath={binding.sourceFilePath}
            tags={binding.tags}
            compatibility={binding.compatibility}
            onRemove={() => onRemoveBinding(binding.id)}
          />
        ))}
        {mapItemBindings.map((binding) => (
          <ScriptAssignmentCard
            key={binding.id}
            title={binding.label}
            subtitle={`Mighty Mike item ${String(binding.signature.itemType)}`}
            sourceFilePath={binding.sourceFilePath}
            tags={binding.tags}
            compatibility={binding.compatibility}
            onRemove={() => onRemoveBinding(binding.id)}
          />
        ))}
      </div>
    </section>
  );
}
