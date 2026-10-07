import {
  MapItemScriptSection,
  SplineItemScriptSection,
  TerrainItemScriptSection,
} from "./ScriptBindingSection";
import { ScriptNativeBindingRow } from "./ScriptNativeBindingRow";
import type {
  ScriptMapItemBinding,
  ScriptMapItemSignature,
  ScriptSplineBinding,
  ScriptSplineBindingSignature,
  ScriptTargetKind,
  ScriptTerrainBinding,
  ScriptTerrainBindingSignature,
} from "./scriptWorkspaceState";
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
  onEditSource?: (path: string) => void;
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
  onEditSource,
}: ScriptNativeBindingsPanelProps) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-white">Native item behaviors</h3>
        <ScriptFieldHelpTooltip label="About native item bindings">
          Bindings target the selected native item using generated predicate guards.
        </ScriptFieldHelpTooltip>
      </div>
      <div className="divide-y divide-slate-800">
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
          <p className="py-3 text-sm text-slate-400">Select a terrain, spline or map item to attach a behavior.</p>
        ) : null}

        {terrainBindings.map((binding) => (
          <ScriptNativeBindingRow
            key={binding.id}
            title={binding.label}
            subtitle={`Terrain item type ${String(binding.signature.itemType)}`}
            sourceFilePath={binding.sourceFilePath}
            tags={binding.tags}
            compatibility={binding.compatibility}
            onRemove={() => onRemoveBinding(binding.id)}
            onEditSource={onEditSource}
          />
        ))}
        {splineBindings.map((binding) => (
          <ScriptNativeBindingRow
            key={binding.id}
            title={binding.label}
            subtitle={`Spline ${String(binding.signature.splineNum)} at ${String(binding.signature.placement)}`}
            sourceFilePath={binding.sourceFilePath}
            tags={binding.tags}
            compatibility={binding.compatibility}
            onRemove={() => onRemoveBinding(binding.id)}
            onEditSource={onEditSource}
          />
        ))}
        {mapItemBindings.map((binding) => (
          <ScriptNativeBindingRow
            key={binding.id}
            title={binding.label}
            subtitle={`Mighty Mike item ${String(binding.signature.itemType)}`}
            sourceFilePath={binding.sourceFilePath}
            tags={binding.tags}
            compatibility={binding.compatibility}
            onRemove={() => onRemoveBinding(binding.id)}
            onEditSource={onEditSource}
          />
        ))}
      </div>
    </section>
  );
}
