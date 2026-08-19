import { useCallback } from "react";
import { Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  WeightBrushSettings,
  SkinWeightsData,
} from "@/modelEditing/weights/weightTypes";
import { findUnweightedVertices } from "@/modelEditing/weights/weightNormalization";

interface WeightBrushPanelProps {
  boneNames: string[];
  skinData: SkinWeightsData | null;
  brushSettings: WeightBrushSettings;
  onBrushSettingsChange: (settings: WeightBrushSettings) => void;
  onRepairWeights?: (repaired: SkinWeightsData) => void;
}

export function WeightBrushPanel({
  boneNames,
  skinData,
  brushSettings,
  onBrushSettingsChange,
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
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-gray-400">Assign To Bone</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="icon"
                size="icon"
                aria-label="Bone assignment format help"
                className="h-6 w-6"
              >
                <Info className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              Each affected vertex is assigned entirely to one bone. Pangea
              models do not support blended bone weights.
            </TooltipContent>
          </Tooltip>
        </div>
        <Select
          value={brushSettings.targetBone ?? ""}
          onValueChange={(v) => update({ targetBone: v || null })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select bone..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {boneNames.map((name) => (
              <SelectItem
                key={name}
                value={name}
                className="text-xs text-white focus:bg-gray-700 focus:text-white"
              >
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {skinData && (
        <div className="rounded border border-gray-700 bg-gray-900/60 p-2 space-y-2">
          <p className="text-xs text-gray-400 font-medium">Diagnostics</p>
          <div className="grid grid-cols-2 gap-x-2 text-xs">
            <span className="text-gray-400">Unassigned vertices</span>
            <span
              className={
                unweightedCount > 0 ? "text-red-400" : "text-green-400"
              }
            >
              {unweightedCount}
            </span>
          </div>
        </div>
      )}

      {!skinData && (
        <p className="text-xs text-gray-500">
          Load an animated model with a skeleton to assign vertices.
        </p>
      )}
    </div>
  );
}
