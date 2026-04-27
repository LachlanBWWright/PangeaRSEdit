import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BoneInfluenceRow } from "@/components/AnimationViewer/rigToolsState";
import { WeightBrushPanel } from "@/components/AnimationViewer/WeightBrushPanel";
import type {
  WeightBrushSettings,
  WeightVisualizationMode,
  SkinWeightsData,
} from "@/modelEditing/weights/weightTypes";
import { defaultWeightBrushSettings } from "@/modelEditing/weights/weightTypes";
import { useState } from "react";

interface RigToolsPanelProps {
  selectedBoneName: string;
  boneRenameInput: string;
  boneInfluenceRows: BoneInfluenceRow[];
  skinData?: SkinWeightsData | null;
  onBoneRenameInputChange: (value: string) => void;
  onRenameSelectedBone: () => void;
  onRepairWeights?: (repaired: SkinWeightsData) => void;
}

export function RigToolsPanel({
  selectedBoneName,
  boneRenameInput,
  boneInfluenceRows,
  skinData,
  onBoneRenameInputChange,
  onRenameSelectedBone,
  onRepairWeights,
}: RigToolsPanelProps) {
  const [brushSettings, setBrushSettings] = useState<WeightBrushSettings>(
    defaultWeightBrushSettings,
  );
  const [visualizationMode, setVisualizationMode] =
    useState<WeightVisualizationMode>("none");

  const boneNames =
    skinData?.boneNames ?? boneInfluenceRows.map((r) => r.boneName);

  return (
    <Tabs defaultValue="bones" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-2">
        <TabsTrigger value="bones" className="text-xs">
          Bones
        </TabsTrigger>
        <TabsTrigger value="weights" className="text-xs">
          Weights
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bones" className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Selected Bone</label>
          <Input
            value={boneRenameInput}
            onChange={(event) => onBoneRenameInputChange(event.target.value)}
            placeholder="Select a bone in the timeline"
            disabled={!selectedBoneName}
          />
          <Button
            onClick={onRenameSelectedBone}
            disabled={!selectedBoneName || !boneRenameInput.trim()}
            className="w-full"
            size="sm"
          >
            Rename Bone
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-400">Bone-Vertex Influence Summary</p>
          <div className="max-h-44 overflow-y-auto rounded border border-gray-700">
            {boneInfluenceRows.length === 0 ? (
              <div className="p-2 text-xs text-gray-500">
                No skinning weights found.
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {boneInfluenceRows.slice(0, 120).map((row) => (
                  <div
                    key={row.boneName}
                    className={`grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 text-xs ${
                      row.boneName === selectedBoneName ? "bg-blue-900/30" : ""
                    }`}
                  >
                    <span className="truncate" title={row.boneName}>
                      {row.boneName}
                    </span>
                    <span className="text-gray-300">vtx {row.vertexCount}</span>
                    <span className="text-gray-400">
                      w {row.weightedSum.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="weights">
        <WeightBrushPanel
          boneNames={boneNames}
          skinData={skinData ?? null}
          brushSettings={brushSettings}
          visualizationMode={visualizationMode}
          onBrushSettingsChange={setBrushSettings}
          onVisualizationModeChange={setVisualizationMode}
          onRepairWeights={onRepairWeights}
        />
      </TabsContent>
    </Tabs>
  );
}
