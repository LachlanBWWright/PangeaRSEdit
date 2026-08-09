import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { BoneInfluenceRow } from "@/components/AnimationViewer/rigToolsState";
import { WeightBrushPanel } from "@/components/AnimationViewer/WeightBrushPanel";
import type { ViewerInteractionMode } from "@/components/model-viewer/types";
import type {
  SkinWeightsData,
  WeightBrushSettings,
} from "@/modelEditing/weights/weightTypes";

interface ModelRigPanelProps {
  selectedBoneName: string | null;
  boneRenameInput: string;
  boneInfluenceRows: BoneInfluenceRow[];
  skinData: SkinWeightsData | null;
  interactionMode: ViewerInteractionMode;
  brushSettings: WeightBrushSettings;
  onSelectBone: (boneName: string) => void;
  onBoneRenameInputChange: (value: string) => void;
  onRenameSelectedBone: () => void;
  onBrushSettingsChange: (settings: WeightBrushSettings) => void;
  onRepairWeights?: (repaired: SkinWeightsData) => void;
}

export function ModelRigPanel({
  selectedBoneName,
  boneRenameInput,
  boneInfluenceRows,
  skinData,
  interactionMode,
  brushSettings,
  onSelectBone,
  onBoneRenameInputChange,
  onRenameSelectedBone,
  onBrushSettingsChange,
  onRepairWeights,
}: ModelRigPanelProps) {
  const maxWeightedSum = Math.max(
    1,
    ...boneInfluenceRows.map((row) => row.weightedSum),
  );

  return (
    <div className="space-y-4">
      {interactionMode === "bone-edit" && (
        <>
          <section className="space-y-2">
            <Label className="text-xs text-gray-400">Selected Bone</Label>
            <Input
              value={boneRenameInput}
              onChange={(event) => onBoneRenameInputChange(event.target.value)}
              placeholder="Choose a bone below"
              disabled={!selectedBoneName}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={onRenameSelectedBone}
              disabled={!selectedBoneName || !boneRenameInput.trim()}
            >
              Rename Bone
            </Button>
          </section>

          <section className="space-y-2 border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Bone Tracks</Label>
              <span className="text-xs text-gray-500">
                {boneInfluenceRows.length} bone
                {boneInfluenceRows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {boneInfluenceRows.length === 0 ? (
                <p className="p-2 text-xs text-gray-500">
                  No skinned bones were found in this model.
                </p>
              ) : (
                boneInfluenceRows.map((row) => {
                  const isSelected = row.boneName === selectedBoneName;
                  const fillPercent = (row.weightedSum / maxWeightedSum) * 100;
                  return (
                    <button
                      key={row.boneName}
                      type="button"
                      className={`w-full rounded-md border text-left transition ${
                        isSelected
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-transparent hover:border-gray-700 hover:bg-gray-900/80"
                      }`}
                      onClick={() => onSelectBone(row.boneName)}
                    >
                      <div className="relative h-11 overflow-hidden rounded-md bg-gray-900/80">
                        <div
                          className="absolute inset-y-0 left-0 bg-sky-500/20"
                          style={{ width: `${fillPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between gap-3 px-3">
                          <span className="truncate text-sm text-gray-100">
                            {row.boneName}
                          </span>
                          <span className="shrink-0 text-xs text-gray-300">
                            {row.vertexCount} vtx · {row.weightedSum.toFixed(1)} w
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      {interactionMode === "paint-weights" && (
        <section>
          <WeightBrushPanel
            boneNames={
              skinData?.boneNames ?? boneInfluenceRows.map((row) => row.boneName)
            }
            skinData={skinData}
            brushSettings={brushSettings}
            onBrushSettingsChange={onBrushSettingsChange}
            onRepairWeights={onRepairWeights}
          />
        </section>
      )}
    </div>
  );
}
