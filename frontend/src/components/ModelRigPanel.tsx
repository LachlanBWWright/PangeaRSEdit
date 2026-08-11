import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { GizmoMode } from "@/components/model-viewer/types";
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
  onCreateBone: (name: string) => void;
  onRemoveSelectedBone: () => void;
  gizmoMode: GizmoMode;
  onGizmoModeChange: (mode: GizmoMode) => void;
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
  onCreateBone,
  onRemoveSelectedBone,
  gizmoMode,
  onGizmoModeChange,
  onBrushSettingsChange,
  onRepairWeights,
}: ModelRigPanelProps) {
  const newBoneName = "NewBone";

  return (
    <div className="space-y-4">
      {interactionMode === "bone-edit" && (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">Bone Assignments</Label>
              <span className="text-xs text-gray-500">
                {boneInfluenceRows.length} bone
                {boneInfluenceRows.length === 1 ? "" : "s"}
              </span>
            </div>
            <Select
              value={selectedBoneName ?? undefined}
              onValueChange={onSelectBone}
              disabled={boneInfluenceRows.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    boneInfluenceRows.length === 0
                      ? "No skinned bones found"
                      : "Select an assigned bone"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {boneInfluenceRows.map((row) => (
                  <SelectItem key={row.boneName} value={row.boneName}>
                    {row.boneName} · {row.vertexCount} vertices
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
            <div className="grid grid-cols-3 gap-1" aria-label="Bone transform tool">
              {(["translate", "rotate", "scale"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={gizmoMode === mode ? "default" : "outline"}
                  onClick={() => onGizmoModeChange(mode)}
                  className="capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => onCreateBone(newBoneName)}>
                <Plus className="mr-1 h-4 w-4" /> Add Child
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onRemoveSelectedBone}
                disabled={!selectedBoneName}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remove
              </Button>
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
