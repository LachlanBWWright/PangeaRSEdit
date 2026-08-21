import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ScriptFieldHelpTooltip } from "./ScriptFieldHelpTooltip";
import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";
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
  { id: "objectType", label: "Existing Game Object" },
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
  readonly { id: ScriptHookId; label: string }[]
> = {
  global: [
    { id: "onLevelLoad", label: "Level Load" },
    { id: "onLevelStart", label: "Level Start" },
    { id: "onFrame", label: "Frame" },
    { id: "onLevelComplete", label: "Level Complete" },
    { id: "onLevelUnload", label: "Level Unload" },
    { id: "onPickupCollected", label: "Pickup Collected" },
    { id: "onWeaponHit", label: "Weapon Hit" },
    { id: "onTriggerEnter", label: "Trigger Enter" },
    { id: "onAreaLoad", label: "Area Load" },
    { id: "onAreaStart", label: "Area Start" },
    { id: "onAreaFrame", label: "Area Frame" },
    { id: "onAreaComplete", label: "Area Complete" },
    { id: "onAreaUnload", label: "Area Unload" },
    { id: "onRaceLoad", label: "Race Load" },
    { id: "onRaceStart", label: "Race Start" },
    { id: "onRaceFrame", label: "Race Frame" },
    { id: "onRaceComplete", label: "Race Complete" },
    { id: "onRaceUnload", label: "Race Unload" },
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

function getInitialScriptLabel(
  target: BehaviorTarget,
  hooks: readonly ScriptHookId[] | undefined,
): string {
  if (target !== "global" || hooks?.length !== 1) {
    return "";
  }

  const hook = HOOK_OPTIONS.global.find((option) => option.id === hooks[0]);
  return hook === undefined ? "" : `${hook.label} Script`;
}

function getObjectTypeOptions(
  tagOptions: readonly ScriptTagDefinition[],
): readonly ScriptTagDefinition[] {
  return tagOptions.filter((tag) => tag.targetKinds.includes("customObject"));
}

function formatObjectOptionDescription(option: ScriptTagDefinition): string {
  return `${option.label} (${option.id})`;
}

function getHookContextType(hookId: ScriptHookId): string {
  const hook = AUTHORITATIVE_API_SCHEMA.hooks.find(
    (candidate) => candidate.name === hookId,
  );
  return hook?.contextType ?? "LevelContext";
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
    "---@type ScriptModule",
    "local module = {}",
    "",
  ];

  hooks.forEach((hook) => {
    lines.push(`---@param ctx ${getHookContextType(hook)}`);
    lines.push(`function module.${hook}(ctx)`);
    lines.push(`  pangea.log.info(${JSON.stringify(`${label}: ${hook}`)})`);
    if (
      hook === "onTerrainItem" ||
      hook === "onSplineItem" ||
      hook === "onMapItem" ||
      hook === "onPickupCollected" ||
      hook === "onWeaponHit" ||
      hook === "onTriggerEnter"
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
  const [label, setLabel] = useState(() =>
    getInitialScriptLabel(initialTarget, initialHooks),
  );
  const [description, setDescription] = useState("");
  const [selectedObjectTypeId, setSelectedObjectTypeId] = useState("");
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([]);

  const availableHooks = HOOK_OPTIONS[target].filter((hook) =>
    hookOptions ? hookOptions.includes(hook.id) : true,
  );
  const objectTypeOptions = useMemo(
    () => getObjectTypeOptions(tagOptions),
    [tagOptions],
  );
  const selectedObjectType = objectTypeOptions.find(
    (option) => option.id === selectedObjectTypeId,
  );
  const generatedSourceFilePath = useMemo(
    () => buildGeneratedSourceFilePath(target, label, existingSourcePaths),
    [existingSourcePaths, label, target],
  );

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
    if (target === "objectType" && selectedObjectTypeId.length === 0) {
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
      objectType: target === "objectType" ? selectedObjectTypeId : undefined,
      sourceFilePath: normalizedSourcePath,
      sourceTemplate,
    });

    setLabel("");
    setDescription("");
    setSelectedObjectTypeId("");
    setSelectedTags([]);
    const defaultHook = getDefaultHook(target);
    setSelectedHooks(defaultHook === null ? [] : [defaultHook]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Create Script</DialogTitle>
          <DialogDescription className="sr-only">
            Define where a Lua script runs and which game events it handles.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto pr-2">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <Label htmlFor="target">Script applies to</Label>
              <ScriptFieldHelpTooltip label="Explain script target">
                Choose the kind of thing this script should attach to. Terrain
                item and spline item scripts run for placed level data. Existing
                game object scripts run for built-in characters, enemies,
                pickups, and hazards.
              </ScriptFieldHelpTooltip>
            </div>
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
            <div className="flex items-center gap-1.5">
              <Label>Runs when</Label>
              <ScriptFieldHelpTooltip label="Explain script events">
                These are the game events that call the script. Pick the event
                that matches what the script needs to react to.
              </ScriptFieldHelpTooltip>
            </div>
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
              <div className="mb-1 flex items-center gap-1.5">
                <Label htmlFor="object-type">Object</Label>
                <ScriptFieldHelpTooltip label="Explain object selection">
                  Pick the existing game object this script should affect. This
                  list only includes objects known for the selected game, so you
                  do not need to enter an internal type name.
                </ScriptFieldHelpTooltip>
              </div>
              <Select
                value={selectedObjectTypeId}
                onValueChange={setSelectedObjectTypeId}
                disabled={objectTypeOptions.length === 0}
              >
                <SelectTrigger id="object-type">
                  <SelectValue placeholder="Select an object" />
                </SelectTrigger>
                <SelectContent>
                  {objectTypeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedObjectType ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatObjectOptionDescription(selectedObjectType)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {objectTypeOptions.length === 0
                    ? "No existing game objects are available for this game yet."
                    : "The script will run only for the selected object."}
                </p>
              )}
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <Label htmlFor="source-file">Source file</Label>
              <ScriptFieldHelpTooltip label="Explain source file">
                This is the Lua file that will be created for the script. The
                path is generated from the script kind and name to keep project
                files organized.
              </ScriptFieldHelpTooltip>
            </div>
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

          {target === "objectType" ? null : (
            <div>
              <div className="flex items-center gap-1.5">
                <Label>Tags</Label>
                <ScriptFieldHelpTooltip label="Explain script tags">
                  Tags describe what this script is meant for. They help group
                  scripts and can be passed into the script context when the
                  script is assigned elsewhere.
                </ScriptFieldHelpTooltip>
              </div>
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
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDefine}
              disabled={
                !label ||
                selectedHooks.length === 0 ||
                (target === "objectType" &&
                  (selectedObjectTypeId.length === 0 ||
                    objectTypeOptions.length === 0))
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
