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
  ScriptCustomObjectPlacement,
} from "./scriptWorkspaceState";
import type { NativeReplacementCompatibility } from "./scriptNativeAudit";
import { ScriptCustomObjectInstancesPanel } from "./ScriptCustomObjectInstancesPanel";

interface ScriptCustomObjectsPanelProps {
  gameId: string;
  customObjectBehaviorId: string;
  onCustomObjectBehaviorIdChange: (value: string) => void;
  customObjectBehaviors: readonly ScriptBehaviorDefinition[];
  customObjectLabel: string;
  onCustomObjectLabelChange: (value: string) => void;
  generatedCustomObjectId: string;
  customObjectOptions: readonly ScriptCustomObjectDefinition[];
  customObjectPlacements: readonly ScriptCustomObjectPlacement[];
  onRemoveCustomObjectPlacement: (placementId: string) => void;
  onExportDefinitions: () => void;
  onImportDefinitions: (file: File) => void;
  onCreateObjectScript?: () => void;
  showCreateObjectScript?: boolean;
  showLevelInstances?: boolean;
  compact?: boolean;
  showHeaderActions?: boolean;
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
  terrainReplacementCompatibility: NativeReplacementCompatibility | null;
  replacementObjectId: string | null;
  onReplaceSelectedItem: (customObjectId: string) => void;
  onRestoreSelectedItem: () => void;
  selectedMapItem: {
    readonly index: number;
    readonly type: number;
    readonly x: number;
    readonly y: number;
  } | null;
  mapReplacementCompatibility: NativeReplacementCompatibility | null;
  mapReplacementObjectId: string | null;
  onReplaceSelectedMapItem: (customObjectId: string) => void;
  onRestoreSelectedMapItem: () => void;
  selectedSplineItem: {
    readonly splineNum: number;
    readonly itemIndex: number;
    readonly nativeType: number;
  } | null;
  splineReplacementCompatibility: NativeReplacementCompatibility | null;
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

function updateCollisionBounds(
  definition: ScriptCustomObjectDefinition,
  axis: "width" | "height" | "depth",
  value: number,
): ScriptCustomObjectDefinition {
  if (definition.collision.kind !== "preset") return definition;
  const bounds = definition.collision.bounds ?? {
    width: 1,
    height: 1,
    depth: 1,
  };
  return {
    ...definition,
    collision: {
      ...definition.collision,
      bounds: { ...bounds, [axis]: value },
    },
  };
}

function updateNativeModelGroup(
  definition: ScriptCustomObjectDefinition,
  group: string,
): ScriptCustomObjectDefinition {
  if (definition.visual.kind !== "nativeDisplayGroup") return definition;
  return {
    ...definition,
    visual: {
      ...definition.visual,
      group: group === "levelSpecific" ? group : "global",
    },
  };
}

function updateVisualIndex(
  definition: ScriptCustomObjectDefinition,
  value: number,
): ScriptCustomObjectDefinition {
  const visual = definition.visual;
  if (visual.kind === "nativeSkeleton") {
    return { ...definition, visual: { ...visual, skeletonType: value } };
  }
  if (
    visual.kind === "nativeDisplayGroup" ||
    visual.kind === "customDisplayGroup"
  ) {
    return { ...definition, visual: { ...visual, modelObject: value } };
  }
  return definition;
}

function updateVisualScale(
  definition: ScriptCustomObjectDefinition,
  scale: number,
): ScriptCustomObjectDefinition {
  const visual = definition.visual;
  if (visual.kind === "none") return definition;
  return { ...definition, visual: { ...visual, scale } };
}

function updateAnimation(
  definition: ScriptCustomObjectDefinition,
  animationName: string,
): ScriptCustomObjectDefinition {
  if (definition.visual.kind !== "customSkeleton") return definition;
  if (definition.visual.animations[animationName] === undefined) {
    return definition;
  }
  return {
    ...definition,
    visual: { ...definition.visual, initialAnimation: animationName },
  };
}

function updateAnimationSpeed(
  definition: ScriptCustomObjectDefinition,
  animationSpeed: number,
): ScriptCustomObjectDefinition {
  if (
    definition.visual.kind !== "nativeSkeleton" &&
    definition.visual.kind !== "customSkeleton"
  ) {
    return definition;
  }
  return { ...definition, visual: { ...definition.visual, animationSpeed } };
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
  customObjectPlacements,
  onRemoveCustomObjectPlacement,
  onExportDefinitions,
  onImportDefinitions,
  onCreateObjectScript,
  showCreateObjectScript = true,
  showLevelInstances = true,
  compact = false,
  showHeaderActions = true,
  onCreateObject,
  onUpdateObject,
  onUploadAsset,
  selectedTerrainItem,
  terrainReplacementCompatibility,
  replacementObjectId,
  onReplaceSelectedItem,
  onRestoreSelectedItem,
  selectedMapItem,
  mapReplacementCompatibility,
  mapReplacementObjectId,
  onReplaceSelectedMapItem,
  onRestoreSelectedMapItem,
  selectedSplineItem,
  splineReplacementCompatibility,
  splineReplacementObjectId,
  onReplaceSelectedSplineItem,
  onRestoreSelectedSplineItem,
}: ScriptCustomObjectsPanelProps) {
  const usesShapeAssets = gameId === "MightyMike-Android";
  return (
    <Card className={compact ? "border-0 bg-transparent shadow-none" : "border-slate-800 bg-slate-950/70"}>
      {!compact || showHeaderActions ? <CardHeader className={compact ? "flex flex-wrap items-center justify-end gap-2 px-0 py-2" : undefined}>
        <div className={compact ? "contents" : "flex flex-wrap items-start justify-between gap-3"}>
          <div>
            <CardTitle className={compact ? "sr-only" : "text-white"}>Custom Objects</CardTitle>
            <CardDescription className={compact ? "sr-only" : undefined}>
              Define reusable scripted object types, then place as many instances
              as you need from the Items menu.
            </CardDescription>
          </div>
          {showCreateObjectScript && onCreateObjectScript ? (
            <Button variant="outline" onClick={onCreateObjectScript}>
              Create Custom Object Script
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onExportDefinitions}>
            Export game definitions
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
            Import definition bundle
            <Input
              type="file"
              accept=".zip"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImportDefinitions(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </CardHeader> : null}
      <CardContent className={compact ? "px-0" : "grid gap-3"}>
        <div className={compact ? "grid gap-5 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.8fr)]" : "grid gap-3"}>
        <div className={compact ? "rounded-lg border border-slate-800 bg-slate-900/60 p-4" : "contents"}>
        {compact ? <div className="mb-3"><p className="text-sm font-medium text-white">Create a definition</p><p className="mt-1 text-xs text-slate-400">Choose a behavior, name the reusable object, then configure its appearance on the right.</p></div> : null}
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
        </div>
        <div className="min-w-0">
        {compact ? <div className="mb-3"><p className="text-sm font-medium text-white">Definitions</p><p className="mt-1 text-xs text-slate-400">Shared by every level in this game.</p></div> : null}
        {showLevelInstances ? (
          <ScriptCustomObjectInstancesPanel
            placements={customObjectPlacements}
            definitions={customObjectOptions}
            onRemovePlacement={onRemoveCustomObjectPlacement}
          />
        ) : null}
        {compact && customObjectOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-300">No definitions yet</p>
            <p className="mt-1 text-xs text-slate-500">Create one from the form on the left, or import a definition bundle.</p>
          </div>
        ) : null}
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
                    accept={usesShapeAssets ? ".shapes" : ".bg3d,.3dmf,.gltf,.glb"}
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
                    accept=".bg3d,.3dmf"
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
                    onUpdateObject(updateNativeModelGroup(objectDefinition, group))
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
                      onUpdateObject(updateVisualIndex(objectDefinition, value));
                    }}
                  />
                  <Input
                    type="number"
                    step="0.05"
                    min="0.01"
                    aria-label={`${objectDefinition.label} scale`}
                    value={objectDefinition.visual.scale}
                    onChange={(event) =>
                      onUpdateObject(
                        updateVisualScale(
                          objectDefinition,
                          parseFiniteNumber(event.target.value, 1),
                        ),
                      )
                    }
                  />
                </>
              ) : null}
              {objectDefinition.visual.kind === "customSkeleton" ? (
                <>
                  <Select
                    value={objectDefinition.visual.initialAnimation}
                    onValueChange={(animationName) =>
                      onUpdateObject(updateAnimation(objectDefinition, animationName))
                    }
                  >
                    <SelectTrigger
                      aria-label={`${objectDefinition.label} initial animation`}
                    >
                      <SelectValue placeholder="Initial animation" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(objectDefinition.visual.animations).map(
                        (animationName) => (
                          <SelectItem key={animationName} value={animationName}>
                            {animationName}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.01"
                    max="100"
                    aria-label={`${objectDefinition.label} animation speed`}
                    value={objectDefinition.visual.animationSpeed}
                    onChange={(event) =>
                      onUpdateObject(
                        updateAnimationSpeed(
                          objectDefinition,
                          parseFiniteNumber(event.target.value, 1),
                        ),
                      )
                    }
                  />
                </>
              ) : null}
              {objectDefinition.visual.kind === "nativeSkeleton" ? (
                <Input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="100"
                  aria-label={`${objectDefinition.label} animation speed`}
                  value={objectDefinition.visual.animationSpeed}
                  onChange={(event) =>
                    onUpdateObject(
                      updateAnimationSpeed(
                        objectDefinition,
                        parseFiniteNumber(event.target.value, 1),
                      ),
                    )
                  }
                />
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
                            bounds:
                              objectDefinition.collision.kind === "preset"
                                ? objectDefinition.collision.bounds
                                : { width: 1, height: 1, depth: 1 },
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
              {objectDefinition.collision.kind === "preset" ? (
                <>
                  <Input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.05"
                    aria-label={`${objectDefinition.label} collision width`}
                    value={objectDefinition.collision.bounds?.width ?? 1}
                    onChange={(event) =>
                      onUpdateObject(
                        updateCollisionBounds(
                          objectDefinition,
                          "width",
                          parseFiniteNumber(event.target.value, 1),
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.05"
                    aria-label={`${objectDefinition.label} collision height`}
                    value={objectDefinition.collision.bounds?.height ?? 1}
                    onChange={(event) =>
                      onUpdateObject(
                        updateCollisionBounds(
                          objectDefinition,
                          "height",
                          parseFiniteNumber(event.target.value, 1),
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.05"
                    aria-label={`${objectDefinition.label} collision depth`}
                    value={objectDefinition.collision.bounds?.depth ?? 1}
                    onChange={(event) =>
                      onUpdateObject(
                        updateCollisionBounds(
                          objectDefinition,
                          "depth",
                          parseFiniteNumber(event.target.value, 1),
                        ),
                      )
                    }
                  />
                </>
              ) : null}
            </div>
            {selectedTerrainItem ? (
              <div className="mt-3 grid gap-2">
                {terrainReplacementCompatibility ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip
                      label={terrainReplacementCompatibility.label}
                      tone={terrainReplacementCompatibility.tone}
                    />
                    <p className="text-xs text-slate-400">
                      {terrainReplacementCompatibility.message}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={
                    terrainReplacementCompatibility?.allowed !== true
                  }
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
              </div>
            ) : null}
            {selectedSplineItem ? (
              <div className="mt-3 grid gap-2">
                {splineReplacementCompatibility ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip
                      label={splineReplacementCompatibility.label}
                      tone={splineReplacementCompatibility.tone}
                    />
                    <p className="text-xs text-slate-400">
                      {splineReplacementCompatibility.message}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={splineReplacementCompatibility?.allowed !== true}
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
              </div>
            ) : null}
            {selectedMapItem ? (
              <div className="mt-3 grid gap-2">
                {mapReplacementCompatibility ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip
                      label={mapReplacementCompatibility.label}
                      tone={mapReplacementCompatibility.tone}
                    />
                    <p className="text-xs text-slate-400">
                      {mapReplacementCompatibility.message}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={mapReplacementCompatibility?.allowed !== true}
                    onClick={() => onReplaceSelectedMapItem(objectDefinition.id)}
                  >
                    Replace selected map item
                  </Button>
                  {mapReplacementObjectId === objectDefinition.id ? (
                    <Button size="sm" variant="outline" onClick={onRestoreSelectedMapItem}>
                      Restore map item
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
