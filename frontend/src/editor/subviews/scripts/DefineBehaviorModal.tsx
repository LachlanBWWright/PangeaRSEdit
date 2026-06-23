import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { ScriptHookId, ScriptTagDefinition } from "./scriptWorkspaceState";

type BehaviorTarget =
  | "global"
  | "terrainItem"
  | "splineItem"
  | "mightyMikeItem"
  | "objectType"
  | "customObject";

const TARGET_OPTIONS: readonly {
  readonly id: BehaviorTarget;
  readonly label: string;
}[] = [
  { id: "global", label: "Global Hook" },
  { id: "terrainItem", label: "Terrain Item" },
  { id: "splineItem", label: "Spline Item" },
  { id: "mightyMikeItem", label: "Mighty Mike Map Item" },
  { id: "objectType", label: "Native Object Type" },
  { id: "customObject", label: "Custom Object" },
];

function parseBehaviorTarget(value: string): BehaviorTarget {
  if (value === "global") {
    return "global";
  }
  if (value === "splineItem") {
    return "splineItem";
  }
  if (value === "mightyMikeItem") {
    return "mightyMikeItem";
  }
  if (value === "objectType") {
    return "objectType";
  }
  if (value === "customObject") {
    return "customObject";
  }
  return "terrainItem";
}

const HOOK_OPTIONS: Record<
  BehaviorTarget,
  ReadonlyArray<{ id: ScriptHookId; label: string }>
> = {
  global: [
    { id: "onLevelLoad", label: "Level Load" },
    { id: "onLevelStart", label: "Level Start" },
    { id: "onFrame", label: "Frame" },
    { id: "onLevelComplete", label: "Level Complete" },
    { id: "onLevelUnload", label: "Level Unload" },
    { id: "onAreaLoad", label: "Area Load" },
    { id: "onAreaStart", label: "Area Start" },
    { id: "onAreaFrame", label: "Area Frame" },
    { id: "onAreaUnload", label: "Area Unload" },
    { id: "onRaceConfig", label: "Race Config" },
    { id: "onRaceStart", label: "Race Start" },
    { id: "onCheckpoint", label: "Checkpoint" },
    { id: "onLapComplete", label: "Lap Complete" },
    { id: "onPowerupCollected", label: "Powerup Collected" },
    { id: "onRaceFinish", label: "Race Finish" },
  ],
  terrainItem: [{ id: "onTerrainItem", label: "Terrain Item" }],
  splineItem: [{ id: "onSplineItem", label: "Spline Item" }],
  mightyMikeItem: [{ id: "onMapItem", label: "Map Item" }],
  objectType: [{ id: "onObjectFrame", label: "Object Frame" }],
  customObject: [{ id: "onObjectFrame", label: "Object Frame" }],
};

function getDefaultHook(target: BehaviorTarget): ScriptHookId | null {
  return HOOK_OPTIONS[target][0]?.id ?? null;
}

interface DefineBehaviorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTarget?: BehaviorTarget;
  initialHooks?: readonly ScriptHookId[];
  hookOptions?: readonly ScriptHookId[];
  tagOptions?: readonly ScriptTagDefinition[];
  existingSourcePaths?: readonly string[];
  onDefine: (definition: {
    target: BehaviorTarget;
    hooks: ScriptHookId[];
    id: string;
    label: string;
    description: string;
    tags: string[];
    objectType?: string;
    sourceFilePath: string;
    sourceTemplate: string;
  }) => void;
}

function slugifyScriptName(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return slug.length === 0 ? "custom-script" : slug;
}

function normalizeSourceFilePath(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("Data/Scripts/src/")) {
    return trimmed.endsWith(".lua") ? trimmed : `${trimmed}.lua`;
  }
  const path = trimmed.length === 0 ? "hooks/custom-script" : trimmed;
  return `Data/Scripts/src/${path.endsWith(".lua") ? path : `${path}.lua`}`;
}

function buildScriptId(sourceFilePath: string): string {
  return `script:${sourceFilePath}`;
}

function buildBehaviorSourceDirectory(target: BehaviorTarget): string {
  switch (target) {
    case "global":
      return "globals";
    case "customObject":
    case "objectType":
      return "objects";
    case "terrainItem":
    case "splineItem":
    case "mightyMikeItem":
      return "bindings";
  }
}

function buildGeneratedSourceFilePath(
  target: BehaviorTarget,
  label: string,
  existingSourcePaths: readonly string[],
): string {
  const directory = buildBehaviorSourceDirectory(target);
  const basePath = normalizeSourceFilePath(
    `${directory}/${slugifyScriptName(label)}`,
  );

  if (!existingSourcePaths.includes(basePath)) {
    return basePath;
  }

  let suffix = 2;
  let candidate = normalizeSourceFilePath(
    `${directory}/${slugifyScriptName(label)}-${String(suffix)}`,
  );
  while (existingSourcePaths.includes(candidate)) {
    suffix += 1;
    candidate = normalizeSourceFilePath(
      `${directory}/${slugifyScriptName(label)}-${String(suffix)}`,
    );
  }

  return candidate;
}

function generateSourceTemplate(
  target: BehaviorTarget,
  hooks: ScriptHookId[],
  label: string,
): string {
  const lines = [
    `-- ${label}`,
    `-- Generated script for ${target}`,
    "local module = {}",
    "",
  ];

  hooks.forEach((hook) => {
    lines.push(`function module.${hook}(ctx)`);
    lines.push(`  pangea.log.info(${JSON.stringify(`${label}: ${hook}`)})`);
    if (
      hook === "onTerrainItem" ||
      hook === "onSplineItem" ||
      hook === "onMapItem"
    ) {
      lines.push("  return { handled = false }");
    }
    lines.push("end", "");
  });

  lines.push("return module", "");
  return lines.join("\n");
}

export function DefineBehaviorModal({
  open,
  onOpenChange,
  initialTarget = "terrainItem",
  initialHooks,
  hookOptions,
  tagOptions = [],
  existingSourcePaths = [],
  onDefine,
}: DefineBehaviorModalProps) {
  const [target, setTarget] = useState<BehaviorTarget>(initialTarget);
  const [selectedHooks, setSelectedHooks] = useState<readonly ScriptHookId[]>(
    initialHooks ?? ["onTerrainItem"],
  );
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [objectType, setObjectType] = useState("");
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([]);

  const availableHooks = HOOK_OPTIONS[target].filter((hook) =>
    hookOptions ? hookOptions.includes(hook.id) : true,
  );
  const generatedSourceFilePath = useMemo(
    () => buildGeneratedSourceFilePath(target, label, existingSourcePaths),
    [existingSourcePaths, label, target],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setTarget(initialTarget);
    setLabel("");
    setDescription("");
    setObjectType("");
    setSelectedTags([]);
    if (initialHooks && initialHooks.length > 0) {
      setSelectedHooks(initialHooks);
      return;
    }
    const defaultHook = getDefaultHook(initialTarget);
    setSelectedHooks(defaultHook === null ? [] : [defaultHook]);
  }, [initialHooks, initialTarget, open]);

  const handleTargetChange = (newTarget: BehaviorTarget) => {
    setTarget(newTarget);
    const defaultHook = getDefaultHook(newTarget);
    const hookAllowed =
      defaultHook !== null &&
      (!hookOptions || hookOptions.includes(defaultHook));
    setSelectedHooks(defaultHook === null || !hookAllowed ? [] : [defaultHook]);
  };

  const handleHookToggle = (hookId: ScriptHookId) => {
    setSelectedHooks((current) =>
      current.includes(hookId)
        ? current.filter((h) => h !== hookId)
        : [...current, hookId],
    );
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((current) =>
      current.includes(tagId)
        ? current.filter((candidate) => candidate !== tagId)
        : [...current, tagId],
    );
  };

  const handleDefine = () => {
    const trimmedLabel = label.trim();
    const trimmedDescription = description.trim();
    const normalizedSourcePath = generatedSourceFilePath;

    if (trimmedLabel.length === 0 || selectedHooks.length === 0) {
      return;
    }
    const trimmedObjectType = objectType.trim();
    if (target === "objectType" && trimmedObjectType.length === 0) {
      return;
    }

    const sourceTemplate = generateSourceTemplate(
      target,
      [...selectedHooks],
      trimmedLabel,
    );

    onDefine({
      target,
      hooks: [...selectedHooks],
      id: buildScriptId(normalizedSourcePath),
      label: trimmedLabel,
      description: trimmedDescription,
      tags: [...selectedTags],
      objectType: target === "objectType" ? trimmedObjectType : undefined,
      sourceFilePath: normalizedSourcePath,
      sourceTemplate,
    });

    setLabel("");
    setDescription("");
    setObjectType("");
    setSelectedTags([]);
    const defaultHook = getDefaultHook(target);
    setSelectedHooks(defaultHook === null ? [] : [defaultHook]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Script</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="target">Target</Label>
            <Select
              value={target}
              onValueChange={(value) =>
                handleTargetChange(parseBehaviorTarget(value))
              }
            >
              <SelectTrigger id="target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Hooks</Label>
            <div className="space-y-2 mt-2">
              {availableHooks.map((hook) => (
                <div key={hook.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`hook-${hook.id}`}
                    checked={selectedHooks.includes(hook.id)}
                    onCheckedChange={() => handleHookToggle(hook.id)}
                  />
                  <label
                    htmlFor={`hook-${hook.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {hook.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="label">Name</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Log Level Start"
            />
          </div>

          {target === "objectType" ? (
            <div>
              <Label htmlFor="object-type">Object type</Label>
              <Input
                id="object-type"
                value={objectType}
                onChange={(event) => setObjectType(event.target.value)}
                placeholder="e.g., bugdom.player"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use the native ID registered by the game runtime.
              </p>
            </div>
          ) : null}

          <div>
            <Label htmlFor="source-file">Source file</Label>
            <Input
              id="source-file"
              value={generatedSourceFilePath}
              readOnly
              placeholder="Generated from the script target and name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this script does"
              rows={3}
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="mt-2 space-y-2 rounded-md border border-slate-800 p-3">
              {tagOptions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No workspace tags are available for this game yet.
                </p>
              ) : (
                tagOptions.map((tag) => (
                  <div key={tag.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                    />
                    <label
                      htmlFor={`tag-${tag.id}`}
                      className="cursor-pointer text-sm"
                    >
                      <span className="font-medium">{tag.label}</span>
                      <span className="block text-xs text-slate-500">
                        {tag.id}
                      </span>
                      {tag.description.length > 0 ? (
                        <span className="mt-1 block text-xs text-slate-400">
                          {tag.description}
                        </span>
                      ) : null}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDefine}
              disabled={
                !label ||
                selectedHooks.length === 0 ||
                (target === "objectType" && objectType.trim().length === 0)
              }
            >
              Create Script
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
