import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip } from "./ScriptSharedComponents";
import type {
  ScriptBehaviorDefinition,
  ScriptCustomObjectDefinition,
} from "./scriptWorkspaceState";

interface ScriptCustomObjectsPanelProps {
  gameId: string;
  customObjectBehaviorId: string;
  onCustomObjectBehaviorIdChange: (value: string) => void;
  customObjectBehaviors: readonly ScriptBehaviorDefinition[];
  customObjectLabel: string;
  onCustomObjectLabelChange: (value: string) => void;
  generatedCustomObjectId: string;
  customObjectOptions: readonly ScriptCustomObjectDefinition[];
  onCreateObject: () => void;
  onUpdateObject: (definition: ScriptCustomObjectDefinition) => void;
  onUploadAsset: (
    definition: ScriptCustomObjectDefinition,
    file: File,
    role: "model" | "skeleton",
  ) => void;
  selectedTerrainItem: {
    readonly index: number;
    readonly type: number;
    readonly x: number;
    readonly z: number;
  } | null;
  replacementObjectId: string | null;
  onReplaceSelectedItem: (customObjectId: string) => void;
  onRestoreSelectedItem: () => void;
  selectedSplineItem: {
    readonly splineNum: number;
    readonly itemIndex: number;
  } | null;
  splineReplacementObjectId: string | null;
  onReplaceSelectedSplineItem: (customObjectId: string) => void;
  onRestoreSelectedSplineItem: () => void;
}

function updateVisualKind(
  definition: ScriptCustomObjectDefinition,
  kind: string,
  gameId: string,
): ScriptCustomObjectDefinition {
  if (kind === "customDisplayGroup") {
    return {
      ...definition,
      visual: {
        kind,
        modelPath:
          gameId === "MightyMike-Android"
            ? "Data/Scripts/assets/models/custom.shapes"
            : "Data/Scripts/assets/models/custom.bg3d",
        modelObject: 0,
        scale: 1,
        slot: 450,
      },
    };
  }
  if (kind === "nativeSkeleton") {
    return {
      ...definition,
      visual: {
        kind,
        skeletonType: 0,
        initialAnimation: 0,
        animationSpeed: 1,
        scale: 1,
        slot: 450,
      },
    };
  }
  if (kind === "customSkeleton") {
    return {
      ...definition,
      visual: {
        kind,
        modelPath: "Data/Scripts/assets/skeletons/custom.bg3d",
        skeletonPath: "Data/Scripts/assets/skeletons/custom.skeleton",
        animations: { idle: 0 },
        initialAnimation: "idle",
        animationSpeed: 1,
        scale: 1,
        slot: 450,
      },
    };
  }
  if (kind === "nativeDisplayGroup") {
    return {
      ...definition,
      visual: {
        kind,
        group: "global",
        modelObject: 0,
        scale: 1,
        slot: 450,
      },
    };
  }
  return { ...definition, visual: { kind: "none" } };
}

function parseFiniteNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ScriptCustomObjectsPanel({
  gameId,
  customObjectBehaviorId,
  onCustomObjectBehaviorIdChange,
  customObjectBehaviors,
  customObjectLabel,
  onCustomObjectLabelChange,
  generatedCustomObjectId,
  customObjectOptions,
  onCreateObject,
  onUpdateObject,
  onUploadAsset,
  selectedTerrainItem,
  replacementObjectId,
  onReplaceSelectedItem,
  onRestoreSelectedItem,
  selectedSplineItem,
  splineReplacementObjectId,
  onReplaceSelectedSplineItem,
  onRestoreSelectedSplineItem,
}: ScriptCustomObjectsPanelProps) {
  const usesShapeAssets = gameId === "MightyMike-Android";
  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <CardTitle className="text-white">Custom Objects</CardTitle>
        <CardDescription>
          Create scripted item definitions. Add saved scripted items from the
          Items menu.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="custom-object-behavior">Object script</Label>
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
        <div>
          <Button
            onClick={onCreateObject}
            disabled={
              customObjectBehaviorId.length === 0 ||
              customObjectLabel.trim().length === 0
            }
          >
            Save Object
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
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <Select
                value={objectDefinition.visual.kind}
                onValueChange={(kind) =>
                  onUpdateObject(updateVisualKind(objectDefinition, kind, gameId))
                }
              >
                <SelectTrigger aria-label={`${objectDefinition.label} visual type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No visual</SelectItem>
                  <SelectItem value="nativeDisplayGroup">Game model</SelectItem>
                  <SelectItem value="customDisplayGroup">
                    {usesShapeAssets ? "Custom shapes" : "Custom BG3D"}
                  </SelectItem>
                  {!usesShapeAssets ? (
                    <SelectItem value="nativeSkeleton">Game skeleton</SelectItem>
                  ) : null}
                  {!usesShapeAssets ? (
                    <SelectItem value="customSkeleton">Custom skeleton</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              {objectDefinition.visual.kind === "customDisplayGroup" ? (
                <Input
                  type="file"
                  accept={usesShapeAssets ? ".shapes" : ".bg3d"}
                  aria-label={`${objectDefinition.label} ${usesShapeAssets ? "shapes" : "BG3D"} model`}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUploadAsset(objectDefinition, file, "model");
                  }}
                />
              ) : null}
              {objectDefinition.visual.kind === "customSkeleton" ? (
                <>
                  <Input
                    type="file"
                    accept=".bg3d"
                    aria-label={`${objectDefinition.label} skeleton model`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadAsset(objectDefinition, file, "model");
                    }}
                  />
                  <Input
                    type="file"
                    accept=".rsrc"
                    aria-label={`${objectDefinition.label} skeleton resource`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadAsset(objectDefinition, file, "skeleton");
                    }}
                  />
                </>
              ) : null}
              {objectDefinition.visual.kind === "nativeDisplayGroup" ? (
                <Select
                  value={objectDefinition.visual.group}
                  onValueChange={(group) =>
                    onUpdateObject({
                      ...objectDefinition,
                      visual: {
                        ...objectDefinition.visual,
                        group: group === "levelSpecific" ? group : "global",
                      },
                    })
                  }
                >
                  <SelectTrigger aria-label={`${objectDefinition.label} model group`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global models</SelectItem>
                    <SelectItem value="levelSpecific">Level models</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {objectDefinition.visual.kind === "nativeDisplayGroup" ||
              objectDefinition.visual.kind === "customDisplayGroup" ||
              objectDefinition.visual.kind === "nativeSkeleton" ? (
                <>
                  <Input
                    type="number"
                    aria-label={`${objectDefinition.label} model or skeleton index`}
                    value={
                      objectDefinition.visual.kind === "nativeSkeleton"
                        ? objectDefinition.visual.skeletonType
                        : objectDefinition.visual.modelObject
                    }
                    onChange={(event) => {
                      const value = Math.trunc(parseFiniteNumber(event.target.value, 0));
                      const visual = objectDefinition.visual;
                      onUpdateObject({
                        ...objectDefinition,
                        visual:
                          visual.kind === "nativeSkeleton"
                            ? { ...visual, skeletonType: value }
                            : { ...visual, modelObject: value },
                      });
                    }}
                  />
                  <Input
                    type="number"
                    step="0.05"
                    min="0.01"
                    aria-label={`${objectDefinition.label} scale`}
                    value={objectDefinition.visual.scale}
                    onChange={(event) =>
                      onUpdateObject({
                        ...objectDefinition,
                        visual: {
                          ...objectDefinition.visual,
                          scale: parseFiniteNumber(event.target.value, 1),
                        },
                      })
                    }
                  />
                </>
              ) : null}
              <Select
                value={
                  objectDefinition.collision.kind === "none"
                    ? "none"
                    : objectDefinition.collision.preset
                }
                onValueChange={(preset) =>
                  onUpdateObject({
                    ...objectDefinition,
                    collision:
                      preset === "none"
                        ? { kind: "none" }
                        : {
                            kind: "preset",
                            preset:
                              preset === "triggerBox" ||
                              preset === "pickup" ||
                              preset === "enemy" ||
                              preset === "platform"
                                ? preset
                                : "solidBox",
                          },
                  })
                }
              >
                <SelectTrigger aria-label={`${objectDefinition.label} collision`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No collision</SelectItem>
                  <SelectItem value="solidBox">Solid box</SelectItem>
                  <SelectItem value="triggerBox">Trigger box</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="enemy">Enemy</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedTerrainItem ? (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onReplaceSelectedItem(objectDefinition.id)}
                >
                  Replace selected native item
                </Button>
                {replacementObjectId === objectDefinition.id ? (
                  <Button size="sm" variant="outline" onClick={onRestoreSelectedItem}>
                    Restore native item
                  </Button>
                ) : null}
              </div>
            ) : null}
            {selectedSplineItem ? (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onReplaceSelectedSplineItem(objectDefinition.id)}
                >
                  Replace selected spline item
                </Button>
                {splineReplacementObjectId === objectDefinition.id ? (
                  <Button size="sm" variant="outline" onClick={onRestoreSelectedSplineItem}>
                    Restore spline item
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
