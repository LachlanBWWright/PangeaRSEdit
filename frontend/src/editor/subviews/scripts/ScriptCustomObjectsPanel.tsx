import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScriptAssignmentCard, StatusChip } from "./ScriptSharedComponents";
import type {
  ScriptBehaviorDefinition,
  ScriptCustomObjectDefinition,
  ScriptCustomObjectPlacement,
} from "./scriptWorkspaceState";

interface ScriptCustomObjectsPanelProps {
  customObjectBehaviorId: string;
  onCustomObjectBehaviorIdChange: (value: string) => void;
  customObjectBehaviors: readonly ScriptBehaviorDefinition[];
  customObjectLabel: string;
  onCustomObjectLabelChange: (value: string) => void;
  generatedCustomObjectId: string;
  placementObjectId: string;
  onPlacementObjectIdChange: (value: string) => void;
  customObjectOptions: readonly ScriptCustomObjectDefinition[];
  customPlacements: readonly ScriptCustomObjectPlacement[];
  selectedCustomPlacement: ScriptCustomObjectPlacement | null;
  onCreateObject: () => void;
  onPlaceObject: () => void;
  onRemovePlacement: (placementId: string) => void;
  onDeleteSelectedPlacement: () => void;
  onSelectedPlacementPositionChange: (
    axis: "x" | "y" | "z",
    value: string,
  ) => void;
}

export function ScriptCustomObjectsPanel({
  customObjectBehaviorId,
  onCustomObjectBehaviorIdChange,
  customObjectBehaviors,
  customObjectLabel,
  onCustomObjectLabelChange,
  generatedCustomObjectId,
  placementObjectId,
  onPlacementObjectIdChange,
  customObjectOptions,
  customPlacements,
  selectedCustomPlacement,
  onCreateObject,
  onPlaceObject,
  onRemovePlacement,
  onDeleteSelectedPlacement,
  onSelectedPlacementPositionChange,
}: ScriptCustomObjectsPanelProps) {
  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <CardTitle className="text-white">Custom Objects</CardTitle>
        <CardDescription>
          Create preview-ready scripted object definitions, then place
          them at the current selection or at the level origin.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="custom-object-behavior">
            Object script
          </Label>
          <Select
            value={customObjectBehaviorId}
            onValueChange={onCustomObjectBehaviorIdChange}
          >
            <SelectTrigger id="custom-object-behavior">
              <SelectValue placeholder="Select an object script" />
            </SelectTrigger>
            <SelectContent>
              {customObjectBehaviors.map((behavior) => (
                <SelectItem key={behavior.id} value={behavior.id}>
                  {behavior.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="custom-object-id">Object id</Label>
            <Input
              id="custom-object-id"
              value={
                customObjectLabel.trim().length === 0
                  ? ""
                  : generatedCustomObjectId
              }
              placeholder="Generated from the label"
              readOnly
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="custom-object-label">Label</Label>
            <Input
              id="custom-object-label"
              value={customObjectLabel}
              onChange={(event) =>
                onCustomObjectLabelChange(event.target.value)
              }
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="placement-object-id">Saved object</Label>
          <Select
            value={placementObjectId}
            onValueChange={onPlacementObjectIdChange}
          >
            <SelectTrigger id="placement-object-id">
              <SelectValue placeholder="Select a saved scripted object" />
            </SelectTrigger>
            <SelectContent>
              {customObjectOptions.map((objectDefinition) => (
                <SelectItem
                  key={objectDefinition.id}
                  value={objectDefinition.id}
                >
                  {objectDefinition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onCreateObject}
            disabled={
              customObjectBehaviorId.length === 0 ||
              customObjectLabel.trim().length === 0
            }
          >
            Save Object
          </Button>
          <Button
            variant="outline"
            onClick={onPlaceObject}
            disabled={customObjectOptions.length === 0}
          >
            Place Object
          </Button>
        </div>
        {customObjectOptions.map((objectDefinition) => (
          <div
            key={objectDefinition.id}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">
                  {objectDefinition.label}
                </p>
                <p className="text-xs text-slate-400">
                  {objectDefinition.sourceFilePath}
                </p>
              </div>
              <StatusChip
                label={
                  objectDefinition.compatibility === "preview-ready"
                    ? "Preview Ready"
                    : "Extended Only"
                }
                tone={
                  objectDefinition.compatibility === "preview-ready"
                    ? "good"
                    : "warning"
                }
              />
            </div>
          </div>
        ))}
        {customPlacements.map((placement) => (
          <ScriptAssignmentCard
            key={placement.id}
            title={placement.label}
            subtitle={`Placement for ${placement.objectId} at (${String(placement.position.x)}, ${String(placement.position.y)}, ${String(placement.position.z)})`}
            sourceFilePath={placement.objectId}
            tags={[]}
            compatibility="preview-ready"
            onRemove={() => onRemovePlacement(placement.id)}
          />
        ))}
        {selectedCustomPlacement ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">
                  Selected Canvas Placement
                </p>
                <p className="text-xs text-slate-300">
                  {selectedCustomPlacement.label} ({selectedCustomPlacement.objectId})
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onDeleteSelectedPlacement}
              >
                Delete Selected Placement
              </Button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="selected-placement-x">X</Label>
                <Input
                  id="selected-placement-x"
                  type="number"
                  value={selectedCustomPlacement.position.x}
                  onChange={(event) =>
                    onSelectedPlacementPositionChange("x", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="selected-placement-y">Y</Label>
                <Input
                  id="selected-placement-y"
                  type="number"
                  value={selectedCustomPlacement.position.y}
                  onChange={(event) =>
                    onSelectedPlacementPositionChange("y", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="selected-placement-z">Z</Label>
                <Input
                  id="selected-placement-z"
                  type="number"
                  value={selectedCustomPlacement.position.z}
                  onChange={(event) =>
                    onSelectedPlacementPositionChange("z", event.target.value)
                  }
                />
              </div>
            </div>
          </div>
        ) : customPlacements.length > 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-400">
            Select a scripted placement on the canvas to edit or delete it here.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}