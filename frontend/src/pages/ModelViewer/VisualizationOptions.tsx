import { Switch } from "@/components/ui/switch";
import { SidebarSection } from "@/components/model-viewer/SidebarSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ViewerInteractionMode } from "@/components/model-viewer/types";
import type { WeightVisualizationMode } from "@/modelEditing/weights/weightTypes";

interface Props {
  wireframeMode: boolean;
  setWireframeMode: (v: boolean) => void;
  showSkeleton: boolean;
  setShowSkeleton: (v: boolean) => void;
  logBonePositions: boolean;
  setLogBonePositions: (v: boolean) => void;
  hasSkeleton: boolean;
  canLogBonePositions: boolean;
  interactionMode: ViewerInteractionMode;
  setInteractionMode: (mode: ViewerInteractionMode) => void;
  weightVisualizationMode: WeightVisualizationMode;
  setWeightVisualizationMode: (mode: WeightVisualizationMode) => void;
  hasSkinWeights: boolean;
}

export function VisualizationOptions({
  wireframeMode,
  setWireframeMode,
  showSkeleton,
  setShowSkeleton,
  logBonePositions,
  setLogBonePositions,
  hasSkeleton,
  canLogBonePositions,
  interactionMode,
  setInteractionMode,
  weightVisualizationMode,
  setWeightVisualizationMode,
  hasSkinWeights,
}: Props) {
  return (
    <SidebarSection title="Workspace">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Mode
          </label>
          <Select
            value={interactionMode}
            onValueChange={(value) => {
              if (
                value === "animate" ||
                value === "bone-edit" ||
                value === "paint-weights"
              ) {
                setInteractionMode(value);
                return;
              }
              setInteractionMode("navigate");
            }}
          >
            <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-gray-600 bg-gray-800 text-white">
              <SelectItem value="navigate">Inspect model</SelectItem>
              <SelectItem value="animate" disabled={!hasSkeleton}>
                Animate
              </SelectItem>
              <SelectItem value="bone-edit" disabled={!hasSkeleton}>
                Edit rig
              </SelectItem>
              <SelectItem value="paint-weights" disabled={!hasSkinWeights}>
                Assign vertices
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-relaxed text-gray-500">
            {interactionMode === "animate"
              ? "Pose bones, edit keyframes, and preview animation events."
              : interactionMode === "bone-edit"
                ? "Edit the skeleton structure, bone names, and transforms."
                : interactionMode === "paint-weights"
                  ? "Left-drag to assign vertices to one bone. Right-drag to orbit."
                  : "Orbit the camera and inspect model rendering."}
          </p>
        </div>

        <div className="space-y-2 border-t border-gray-700/70 pt-3">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Display
          </div>
          {(interactionMode === "navigate" ||
            interactionMode === "bone-edit") && (
            <div className="flex items-center justify-between">
              <label
                htmlFor="wireframe-mode"
                className="text-sm text-gray-300 cursor-pointer"
              >
                Wireframe
              </label>
              <Switch
                id="wireframe-mode"
                checked={wireframeMode}
                onCheckedChange={setWireframeMode}
              />
            </div>
          )}
        {hasSkeleton &&
          (interactionMode === "animate" || interactionMode === "bone-edit") && (
          <div className="flex items-center justify-between">
            <label
              htmlFor="show-skeleton"
              className="text-sm text-gray-300 cursor-pointer"
            >
              Skeleton
            </label>
            <Switch
              id="show-skeleton"
              checked={showSkeleton}
              onCheckedChange={setShowSkeleton}
            />
          </div>
        )}
        {canLogBonePositions && interactionMode === "animate" && (
          <div className="flex items-center justify-between">
            <label
              htmlFor="log-bone-positions"
              className="text-sm text-gray-300 cursor-pointer"
            >
              Log bones
            </label>
            <Switch
              id="log-bone-positions"
              checked={logBonePositions}
              onCheckedChange={setLogBonePositions}
            />
          </div>
        )}
        {canLogBonePositions &&
          interactionMode === "animate" &&
          logBonePositions && (
          <p className="text-xs text-gray-400 italic">
            Check console for bone position logs during animation playback
          </p>
        )}
        {interactionMode === "paint-weights" && (
          <div className="space-y-2 pt-1">
            <label className="text-xs text-gray-300">Assignment overlay</label>
            <Select
              value={weightVisualizationMode}
              onValueChange={(value) => {
                if (
                  value === "heatmap" ||
                  value === "dominant" ||
                  value === "unweighted"
                ) {
                  setWeightVisualizationMode(value);
                  return;
                }
                setWeightVisualizationMode("none");
              }}
            >
              <SelectTrigger className="h-8 border-gray-600 bg-gray-800 text-xs text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-600 bg-gray-800 text-white">
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="dominant">Assigned bone</SelectItem>
                <SelectItem value="unweighted">Unassigned vertices</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        </div>
      </div>
    </SidebarSection>
  );
}
