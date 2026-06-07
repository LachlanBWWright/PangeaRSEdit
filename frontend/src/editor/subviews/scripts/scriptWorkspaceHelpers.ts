import { Game, type GlobalsInterface } from "@/data/globals/globals";
import type { SplineData, SplineItem } from "@/python/structSpecs/LevelTypes";
import type { getSelectedItem } from "@/editor/subviews/items/itemMenuState";
import { getItemName } from "@/data/items/getItemNames";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { SPLINE_KEY_BASE } from "@/editor/subviews/splines/splineUtils";
import type {
  ScriptBehaviorDefinition,
  ScriptHookId,
  ScriptTargetKind,
  ScriptWorkspaceState,
} from "./scriptWorkspaceState";

export function getSelectedSplineItem(
  splineData: SplineData | null,
  selectedSpline: number | undefined,
  selectedSplineItem: number | undefined,
): SplineItem | null {
  if (splineData === null) {
    return null;
  }
  if (selectedSpline === undefined || selectedSplineItem === undefined) {
    return null;
  }

  const splineItems = splineData.SpIt[SPLINE_KEY_BASE + selectedSpline]?.obj;
  return splineItems?.[selectedSplineItem] ?? null;
}

export function getLevelState(workspace: ScriptWorkspaceState) {
  return (
    workspace.levels[workspace.context.levelKey] ?? {
      globalHooks: [],
      terrainBindings: [],
      splineBindings: [],
      mapItemBindings: [],
      customPlacements: [],
    }
  );
}

export function buildSelectionLabel(
  globals: GlobalsInterface,
  selectedItemData: ReturnType<typeof getSelectedItem> | null,
  selectedSplineItemData: SplineItem | null,
): string {
  if (selectedSplineItemData) {
    return `${getSplineItemName(globals, selectedSplineItemData.type)} at placement ${String(selectedSplineItemData.placement)}`;
  }

  if (selectedItemData) {
    return `${getItemName(globals, selectedItemData.type)} at (${String(selectedItemData.x)}, ${String(selectedItemData.z)})`;
  }

  return "Nothing selected";
}

export function filterBehaviors(
  behaviors: readonly ScriptBehaviorDefinition[],
  targetKind: ScriptTargetKind,
  hookId?: ScriptHookId,
): readonly ScriptBehaviorDefinition[] {
  return behaviors.filter((behavior) => {
    if (!behavior.targetKinds.includes(targetKind)) {
      return false;
    }
    if (!hookId) {
      return true;
    }
    return behavior.supportedHooks.includes(hookId);
  });
}

export function buildOriginalLevelFileName(
  gameType: Game,
  levelNumber: number | null,
): string {
  const suffix = levelNumber === null ? "current" : String(levelNumber);
  if (gameType === Game.MIGHTY_MIKE) {
    return `level-${suffix}.map`;
  }

  return `level-${suffix}.ter`;
}

export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([Uint8Array.from(bytes)], {
    type: "application/zip",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function parseParamType(value: string): "number" | "boolean" | "string" {
  if (value === "boolean") {
    return "boolean";
  }
  if (value === "string") {
    return "string";
  }
  return "number";
}

export function statusToneClass(
  tone: "neutral" | "good" | "warning" | "danger",
): string {
  if (tone === "good") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  }
  if (tone === "warning") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  }
  if (tone === "danger") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-100";
  }
  return "border-slate-500/40 bg-slate-500/10 text-slate-100";
}

function slugifyScriptIdentifier(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return slug.length === 0 ? "custom-object" : slug;
}

export function buildGeneratedCustomObjectId(
  label: string,
  existingObjectIds: readonly string[],
): string {
  const baseId = `custom.${slugifyScriptIdentifier(label)}`;
  if (!existingObjectIds.includes(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}-${String(suffix)}`;
  while (existingObjectIds.includes(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${String(suffix)}`;
  }

  return candidate;
}

export type ScriptSourceDirectory = "root" | "globals" | "bindings" | "objects";

export type ScriptSourceLanguage = "ts";

export const SCRIPT_SOURCE_DIRECTORY_OPTIONS: readonly {
  readonly id: ScriptSourceDirectory;
  readonly label: string;
}[] = [
  { id: "root", label: "Project Root" },
  { id: "globals", label: "Globals" },
  { id: "bindings", label: "Bindings" },
  { id: "objects", label: "Objects" },
];

export const SCRIPT_SOURCE_LANGUAGE_OPTIONS: readonly {
  readonly id: ScriptSourceLanguage;
  readonly label: string;
}[] = [
  { id: "ts", label: "TypeScript" },
];

export function parseScriptSourceDirectory(
  value: string,
): ScriptSourceDirectory {
  switch (value) {
    case "globals":
      return "globals";
    case "bindings":
      return "bindings";
    case "objects":
      return "objects";
    case "root":
      return "root";
    default:
      return "root";
  }
}

export function parseScriptSourceLanguage(
  _value: string,
): ScriptSourceLanguage {
  return "ts";
}

function buildScriptSourceDirectoryPath(
  directory: ScriptSourceDirectory,
): string {
  switch (directory) {
    case "globals":
      return "Data/Scripts/src/globals";
    case "bindings":
      return "Data/Scripts/src/bindings";
    case "objects":
      return "Data/Scripts/src/objects";
    case "root":
      return "Data/Scripts/src";
  }
}

export function buildGeneratedScriptSourcePath(
  fileName: string,
  directory: ScriptSourceDirectory,
  language: ScriptSourceLanguage,
  existingSourcePaths: readonly string[],
): string {
  const baseName = slugifyScriptIdentifier(fileName);
  const baseDirectory = buildScriptSourceDirectoryPath(directory);
  const basePath = `${baseDirectory}/${baseName}.${language}`;

  if (!existingSourcePaths.includes(basePath)) {
    return basePath;
  }

  let suffix = 2;
  let candidate = `${baseDirectory}/${baseName}-${String(suffix)}.${language}`;
  while (existingSourcePaths.includes(candidate)) {
    suffix += 1;
    candidate = `${baseDirectory}/${baseName}-${String(suffix)}.${language}`;
  }

  return candidate;
}

export function buildDefaultScriptSourceContent(
  _language: ScriptSourceLanguage,
): string {
  return [
    "export function onLevelStart(ctx: LevelContext): void {",
    '  pangea.log.info("LEVEL_EDITOR_SCRIPTING: custom TS file");',
    "}",
    "",
  ].join("\n");
}
