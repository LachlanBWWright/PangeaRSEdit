import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  WeightBrushSettings,
  WeightBrushMode,
  WeightFalloff,
  WeightVisualizationMode,
  SkinWeightsData,
} from "@/modelEditing/weights/weightTypes";
import {
  findUnweightedVertices,
  findNormalizationErrors,
  repairNormalizationErrors,
} from "@/modelEditing/weights/weightNormalization";

interface WeightBrushPanelProps {
  boneNames: string[];
  skinData: SkinWeightsData | null;
  brushSettings: WeightBrushSettings;
  visualizationMode: WeightVisualizationMode;
  onBrushSettingsChange: (settings: WeightBrushSettings) => void;
  onVisualizationModeChange: (mode: WeightVisualizationMode) => void;
  onRepairWeights?: (repaired: SkinWeightsData) => void;
}

const BRUSH_MODES: { value: WeightBrushMode; label: string }[] = [
  { value: "paint", label: "Paint" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "smooth", label: "Smooth" },
  { value: "normalize", label: "Normalize" },
];

const FALLOFF_OPTIONS: { value: WeightFalloff; label: string }[] = [
  { value: "smooth", label: "Smooth" },
  { value: "linear", label: "Linear" },
  { value: "sharp", label: "Sharp" },
];

const VIZ_MODES: { value: WeightVisualizationMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "heatmap", label: "Heatmap" },
  { value: "dominant", label: "Dominant Bone" },
  { value: "unweighted", label: "Unweighted" },
];

export function WeightBrushPanel({
  boneNames,
  skinData,
  brushSettings,
  visualizationMode,
  onBrushSettingsChange,
  onVisualizationModeChange,
  onRepairWeights,
}: WeightBrushPanelProps) {
  const update = useCallback(
    (patch: Partial<WeightBrushSettings>) => {
      onBrushSettingsChange({ ...brushSettings, ...patch });
    },
    [brushSettings, onBrushSettingsChange],
  );

  const unweightedCount = skinData
    ? findUnweightedVertices(skinData).length
    : 0;
  const normErrorCount = skinData
    ? findNormalizationErrors(skinData).length
    : 0;

  const handleRepair = useCallback(() => {
    if (!skinData || !onRepairWeights) return;
    onRepairWeights(repairNormalizationErrors(skinData));
  }, [skinData, onRepairWeights]);

  return (
    <div className="space-y-4">
      {/* Visualization mode */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Visualization</Label>
        <div className="grid grid-cols-2 gap-1">
          {VIZ_MODES.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={visualizationMode === m.value ? "default" : "outline"}
              className="text-xs h-7"
              onClick={() => onVisualizationModeChange(m.value)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Target bone */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Target Bone</Label>
        <Select
          value={brushSettings.targetBone ?? ""}
          onValueChange={(v) => update({ targetBone: v || null })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select bone..." />
          </SelectTrigger>
          <SelectContent>
            {boneNames.map((name) => (
              <SelectItem key={name} value={name} className="text-xs">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brush mode */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Brush Mode</Label>
        <div className="grid grid-cols-3 gap-1">
          {BRUSH_MODES.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={brushSettings.mode === m.value ? "default" : "outline"}
              className="text-xs h-7"
              onClick={() => update({ mode: m.value })}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-xs text-gray-400">Radius</Label>
          <span className="text-xs text-gray-300">
            {brushSettings.radius.toFixed(2)}
          </span>
        </div>
        <Slider
          min={0.05}
          max={5}
          step={0.05}
          value={[brushSettings.radius]}
          onValueChange={([v]) => update({ radius: v ?? brushSettings.radius })}
        />
      </div>

      {/* Strength */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <Label className="text-xs text-gray-400">Strength</Label>
          <span className="text-xs text-gray-300">
            {(brushSettings.strength * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[brushSettings.strength]}
          onValueChange={([v]) =>
            update({ strength: v ?? brushSettings.strength })
          }
        />
      </div>

      {/* Falloff */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Falloff</Label>
        <div className="grid grid-cols-3 gap-1">
          {FALLOFF_OPTIONS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={
                brushSettings.falloff === f.value ? "default" : "outline"
              }
              className="text-xs h-7"
              onClick={() => update({ falloff: f.value })}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Auto-normalize */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-400">Auto-normalize</Label>
        <Switch
          checked={brushSettings.autoNormalize}
          onCheckedChange={(checked) => update({ autoNormalize: checked })}
        />
      </div>

      {/* Diagnostics & repair */}
      {skinData && (
        <div className="rounded border border-gray-700 bg-gray-900/60 p-2 space-y-2">
          <p className="text-xs text-gray-400 font-medium">Diagnostics</p>
          <div className="grid grid-cols-2 gap-x-2 text-xs">
            <span className="text-gray-400">Unweighted vertices</span>
            <span
              className={
                unweightedCount > 0 ? "text-red-400" : "text-green-400"
              }
            >
              {unweightedCount}
            </span>
            <span className="text-gray-400">Normalization errors</span>
            <span
              className={
                normErrorCount > 0 ? "text-yellow-400" : "text-green-400"
              }
            >
              {normErrorCount}
            </span>
          </div>
          {normErrorCount > 0 && onRepairWeights && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={handleRepair}
            >
              Repair Normalization ({normErrorCount})
            </Button>
          )}
        </div>
      )}

      {!skinData && (
        <p className="text-xs text-gray-500">
          Load an animated model with a skeleton to use weight painting.
        </p>
      )}
    </div>
  );
}
