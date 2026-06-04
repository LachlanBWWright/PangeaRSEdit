import { atom } from "jotai";
import { getItemName } from "@/data/items/getItemNames";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { SplineItem, TerrainItem } from "@/python/structSpecs/LevelTypes";
import { getGameKeyFromName } from "@/validation/gameRepositories";

export type ScriptHookId = "level.onLoad" | "level.onTick" | "object.onFrame";
export type ScriptAssetFormat = "bg3d" | "qd3d" | "Skeleton.rsrc";
export type ScriptParamKind = "number" | "boolean" | "enum" | "string";

export interface ScriptHookDefinition {
  id: ScriptHookId;
  label: string;
  scope: string;
  description: string;
}

export interface ScriptContext {
  key: string;
  gameKey: string;
  gameName: string;
  levelId: string;
  levelNumber?: number;
  scene?: string;
  sourceNamespace: string;
}

export interface ScriptProjectManifest {
  schemaVersion: number;
  game: string;
  runtime: "duktape";
  configRoot: string;
  sourceRoot: string;
  distRoot: string;
  features: {
    nativeBindings: boolean;
    customPlacements: boolean;
    parameterSchemas: boolean;
  };
}

export interface ScriptLevelEntry {
  levelId: string;
  route: {
    levelNumber?: number;
    scene?: string;
  };
  enabled: boolean;
  sourceScript: string;
  compiledScript: string;
  hooks: ScriptHookId[];
}

export interface ScriptLevelsManifest {
  schemaVersion: number;
  levels: ScriptLevelEntry[];
}

export interface ScriptBindingTargetBase {
  nativeType: number;
  nativeName: string;
  params: {
    flags: number;
    p0: number;
    p1: number;
    p2: number;
    p3: number;
  };
}

export interface ScriptTerrainBindingTarget extends ScriptBindingTargetBase {
  kind: "terrainItem";
  index: number;
  position: {
    x: number;
    z: number;
  };
}

export interface ScriptSplineBindingTarget extends ScriptBindingTargetBase {
  kind: "splineItem";
  splineIndex: number;
  itemIndex: number;
  placement: number;
}

export type ScriptBindingTarget =
  | ScriptTerrainBindingTarget
  | ScriptSplineBindingTarget;

export interface ScriptBinding {
  id: string;
  target: ScriptBindingTarget;
  scriptModule: string;
  behavior: string;
  hooks: ScriptHookId[];
  tags: string[];
  paramRefs: string[];
}

export interface ScriptBindingsManifest {
  schemaVersion: number;
  levelId: string;
  bindings: ScriptBinding[];
}

export interface ScriptCustomObjectDefinition {
  id: string;
  name: string;
  modelFormat: ScriptAssetFormat;
  modelPath: string;
  scriptModule: string;
  behavior: string;
  collision: string;
  tags: string[];
  defaultParamRefs: string[];
}

export interface ScriptCustomObjectPlacement {
  id: string;
  definitionId: string;
  levelId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotationY: number;
  paramRefs: string[];
}

export interface ScriptPlacementsManifest {
  schemaVersion: number;
  levelId: string;
  customObjects: ScriptCustomObjectPlacement[];
}

export interface ScriptObjectsManifest {
  schemaVersion: number;
  objects: ScriptCustomObjectDefinition[];
}

export interface ScriptParamDefinition {
  id: string;
  label: string;
  kind: ScriptParamKind;
  description: string;
  defaultValue: string | number | boolean;
  enumOptions: string[];
}

export interface ScriptParamsManifest {
  schemaVersion: number;
  params: ScriptParamDefinition[];
}

export interface ScriptDraft {
  project: ScriptProjectManifest;
  levels: ScriptLevelsManifest;
  bindingsByLevel: Record<string, ScriptBindingsManifest>;
  placementsByLevel: Record<string, ScriptPlacementsManifest>;
  objects: ScriptObjectsManifest;
  params: ScriptParamsManifest;
}

export interface ScriptSidecarFile {
  path: string;
  downloadName: string;
  content: string;
}

export interface UpsertTerrainItemBindingInput {
  context: ScriptContext;
  draft: ScriptDraft;
  globals: GlobalsInterface;
  itemIndex: number;
  item: TerrainItem;
  scriptModule: string;
  behavior: string;
  tags: string[];
  paramRefs: string[];
}

export interface UpsertSplineItemBindingInput {
  context: ScriptContext;
  draft: ScriptDraft;
  globals: GlobalsInterface;
  splineIndex: number;
  splineItemIndex: number;
  splineItem: SplineItem;
  scriptModule: string;
  behavior: string;
  tags: string[];
  paramRefs: string[];
}

export interface AddCustomObjectDefinitionInput {
  draft: ScriptDraft;
  definition: ScriptCustomObjectDefinition;
}

export interface AddCustomObjectPlacementInput {
  context: ScriptContext;
  draft: ScriptDraft;
  placement: ScriptCustomObjectPlacement;
}

export interface AddParamDefinitionInput {
  draft: ScriptDraft;
  definition: ScriptParamDefinition;
}

export const SCRIPT_HOOKS: ReadonlyArray<ScriptHookDefinition> = [
  {
    id: "level.onLoad",
    label: "Level Load",
    scope: "levels.json",
    description: "Runs once when the current level sidecars are loaded.",
  },
  {
    id: "level.onTick",
    label: "Level Tick",
    scope: "levels.json",
    description: "Runs for frame-level scripts that are not attached to a single object.",
  },
  {
    id: "object.onFrame",
    label: "Object Frame",
    scope: "bindings/<level-id>.json and objects.json",
    description: "Runs every frame for bound native items and ports-only custom objects.",
  },
];

export const SCRIPT_ASSET_FORMATS: ReadonlyArray<ScriptAssetFormat> = [
  "bg3d",
  "qd3d",
  "Skeleton.rsrc",
];

export const SCRIPT_PARAM_KINDS: ReadonlyArray<ScriptParamKind> = [
  "number",
  "boolean",
  "enum",
  "string",
];

export const scriptSidecarDraftStoreAtom = atom<Record<string, ScriptDraft>>({});

function normalizeGameKey(gameName: string): string {
  return gameName.replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function formatLevelNumber(levelNumber: number): string {
  return levelNumber.toString().padStart(2, "0");
}

function buildLevelId(
  gameKey: string,
  levelNumber: number | undefined,
  scene: string | undefined,
): string {
  if (gameKey === "mightymike" && scene !== undefined) {
    if (levelNumber !== undefined) {
      return `${scene}-level-${formatLevelNumber(levelNumber)}`;
    }
    return `scene-${scene}`;
  }

  if (levelNumber !== undefined) {
    return `level-${formatLevelNumber(levelNumber)}`;
  }

  if (scene !== undefined) {
    return `scene-${scene}`;
  }

  return "level-unspecified";
}

function createLevelEntry(context: ScriptContext): ScriptLevelEntry {
  return {
    levelId: context.levelId,
    route: {
      levelNumber: context.levelNumber,
      scene: context.scene,
    },
    enabled: true,
    sourceScript: `Data/Scripts/src/${context.sourceNamespace}.ts`,
    compiledScript: `Data/Scripts/dist/${context.sourceNamespace}.js`,
    hooks: ["level.onLoad", "level.onTick"],
  };
}

function createEmptyBindingsManifest(levelId: string): ScriptBindingsManifest {
  return {
    schemaVersion: 1,
    levelId,
    bindings: [],
  };
}

function createEmptyPlacementsManifest(
  levelId: string,
): ScriptPlacementsManifest {
  return {
    schemaVersion: 1,
    levelId,
    customObjects: [],
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function ensureLevelEntry(draft: ScriptDraft, context: ScriptContext): ScriptDraft {
  const hasEntry = draft.levels.levels.some(
    (entry) => entry.levelId === context.levelId,
  );
  if (hasEntry) {
    return draft;
  }

  return {
    ...draft,
    levels: {
      ...draft.levels,
      levels: [...draft.levels.levels, createLevelEntry(context)],
    },
  };
}

function ensureBindingsManifest(
  draft: ScriptDraft,
  levelId: string,
): ScriptBindingsManifest {
  return draft.bindingsByLevel[levelId] ?? createEmptyBindingsManifest(levelId);
}

function ensurePlacementsManifest(
  draft: ScriptDraft,
  levelId: string,
): ScriptPlacementsManifest {
  return (
    draft.placementsByLevel[levelId] ?? createEmptyPlacementsManifest(levelId)
  );
}

function replaceBinding(
  bindings: ScriptBinding[],
  nextBinding: ScriptBinding,
): ScriptBinding[] {
  const remainingBindings = bindings.filter((binding) => {
    if (binding.target.kind !== nextBinding.target.kind) {
      return true;
    }

    if (
      binding.target.kind === "terrainItem" &&
      nextBinding.target.kind === "terrainItem"
    ) {
      return binding.target.index !== nextBinding.target.index;
    }

    if (
      binding.target.kind === "splineItem" &&
      nextBinding.target.kind === "splineItem"
    ) {
      return (
        binding.target.splineIndex !== nextBinding.target.splineIndex ||
        binding.target.itemIndex !== nextBinding.target.itemIndex
      );
    }

    return true;
  });

  return [...remainingBindings, nextBinding];
}

function replaceLevelEntry(
  levels: ScriptLevelEntry[],
  levelId: string,
  updates: Partial<ScriptLevelEntry>,
): ScriptLevelEntry[] {
  let found = false;
  const nextLevels = levels.map((entry) => {
    if (entry.levelId !== levelId) {
      return entry;
    }

    found = true;
    return {
      ...entry,
      ...updates,
    };
  });

  return found ? nextLevels : levels;
}

export function splitCommaSeparated(value: string): string[] {
  return uniqueStrings(
    value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
}

export function parseNumericInput(value: string, fallback: number): number {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function buildParamDefaultValue(
  kind: ScriptParamKind,
  defaultValue: string,
  enumOptions: string[],
): string | number | boolean {
  if (kind === "number") {
    return parseNumericInput(defaultValue, 0);
  }

  if (kind === "boolean") {
    return defaultValue.trim().toLowerCase() === "true";
  }

  if (kind === "enum") {
    return enumOptions[0] ?? defaultValue.trim();
  }

  return defaultValue;
}

export function parseScriptAssetFormat(value: string): ScriptAssetFormat {
  const matchedFormat = SCRIPT_ASSET_FORMATS.find((format) => format === value);
  return matchedFormat ?? "bg3d";
}

export function parseScriptParamKind(value: string): ScriptParamKind {
  const matchedKind = SCRIPT_PARAM_KINDS.find((kind) => kind === value);
  return matchedKind ?? "number";
}

export function createScriptContext(
  globals: GlobalsInterface,
  levelNumber: number | undefined,
  scene: string | undefined,
): ScriptContext {
  const gameKey = getGameKeyFromName(globals.GAME_NAME) ?? normalizeGameKey(globals.GAME_NAME);
  const levelId = buildLevelId(gameKey, levelNumber, scene);
  const sourceNamespace = `${gameKey}/${levelId}`;

  return {
    key: `${gameKey}:${levelId}`,
    gameKey,
    gameName: globals.GAME_NAME,
    levelId,
    levelNumber,
    scene,
    sourceNamespace,
  };
}

export function createDefaultScriptDraft(context: ScriptContext): ScriptDraft {
  return {
    project: {
      schemaVersion: 1,
      game: context.gameName,
      runtime: "duktape",
      configRoot: "Data/Scripts/config",
      sourceRoot: "Data/Scripts/src",
      distRoot: "Data/Scripts/dist",
      features: {
        nativeBindings: true,
        customPlacements: true,
        parameterSchemas: true,
      },
    },
    levels: {
      schemaVersion: 1,
      levels: [createLevelEntry(context)],
    },
    bindingsByLevel: {
      [context.levelId]: createEmptyBindingsManifest(context.levelId),
    },
    placementsByLevel: {
      [context.levelId]: createEmptyPlacementsManifest(context.levelId),
    },
    objects: {
      schemaVersion: 1,
      objects: [],
    },
    params: {
      schemaVersion: 1,
      params: [],
    },
  };
}

export function createReferenceSampleDraft(context: ScriptContext): ScriptDraft {
  const sampleDraft = createDefaultScriptDraft(context);
  const motionParamId =
    context.gameKey === "ottomatic"
      ? "motion.verticalBob"
      : `${context.gameKey}.hoverAmplitude`;
  const guideDefinitionId =
    context.gameKey === "ottomatic"
      ? "custom.repairDrone"
      : `custom.${context.gameKey}.guideMarker`;
  const guidePlacementId = `${guideDefinitionId}.001`;
  const bindingsManifest = ensureBindingsManifest(sampleDraft, context.levelId);
  const placementsManifest = ensurePlacementsManifest(sampleDraft, context.levelId);

  return {
    ...sampleDraft,
    levels: {
      ...sampleDraft.levels,
      levels: replaceLevelEntry(sampleDraft.levels.levels, context.levelId, {
        sourceScript:
          context.gameKey === "ottomatic"
            ? "Data/Scripts/src/ottomatic/humans.ts"
            : `Data/Scripts/src/${context.gameKey}/starter.ts`,
        compiledScript:
          context.gameKey === "ottomatic"
            ? "Data/Scripts/dist/ottomatic/humans.js"
            : `Data/Scripts/dist/${context.gameKey}/starter.js`,
      }),
    },
    bindingsByLevel: {
      ...sampleDraft.bindingsByLevel,
      [context.levelId]: {
        ...bindingsManifest,
        bindings: [
          {
            id:
              context.gameKey === "ottomatic"
                ? "terrain-human-012"
                : `terrain-${context.gameKey}-000`,
            target: {
              kind: "terrainItem",
              index: context.gameKey === "ottomatic" ? 12 : 0,
              nativeType: context.gameKey === "ottomatic" ? 4 : 0,
              nativeName:
                context.gameKey === "ottomatic"
                  ? "Human Scientist"
                  : "Example Native Item",
              position: {
                x: 1560,
                z: -320,
              },
              params: {
                flags: 0,
                p0: 0,
                p1: 0,
                p2: 0,
                p3: 0,
              },
            },
            scriptModule:
              context.gameKey === "ottomatic"
                ? "ottomatic/humans"
                : `${context.gameKey}/starter`,
            behavior:
              context.gameKey === "ottomatic" ? "humanBob" : "nativeHover",
            hooks: ["object.onFrame"],
            tags: uniqueStrings([
              `${context.gameKey}.native`,
              "scripted.preview",
            ]),
            paramRefs: [motionParamId],
          },
        ],
      },
    },
    placementsByLevel: {
      ...sampleDraft.placementsByLevel,
      [context.levelId]: {
        ...placementsManifest,
        customObjects: [
          {
            id: guidePlacementId,
            definitionId: guideDefinitionId,
            levelId: context.levelId,
            position: {
              x: 1680,
              y: 0,
              z: -240,
            },
            rotationY: 1.57,
            paramRefs: [motionParamId],
          },
        ],
      },
    },
    objects: {
      ...sampleDraft.objects,
      objects: [
        {
          id: guideDefinitionId,
          name:
            context.gameKey === "ottomatic" ? "Repair Drone" : "Guide Marker",
          modelFormat: "bg3d",
          modelPath: `Data/Scripts/assets/models/${guideDefinitionId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.bg3d`,
          scriptModule:
            context.gameKey === "ottomatic"
              ? "ottomatic/humans"
              : `${context.gameKey}/starter`,
          behavior:
            context.gameKey === "ottomatic" ? "repairDroneHover" : "guideHover",
          collision: "capsule",
          tags: uniqueStrings([
            `${context.gameKey}.custom`,
            "scripted.preview",
          ]),
          defaultParamRefs: [motionParamId],
        },
      ],
    },
    params: {
      ...sampleDraft.params,
      params: [
        {
          id: motionParamId,
          label: "Vertical Bob Height",
          kind: "number",
          description:
            "Reusable amplitude parameter for native bindings and scripted custom objects.",
          defaultValue: context.gameKey === "ottomatic" ? 80 : 48,
          enumOptions: [],
        },
      ],
    },
  };
}

export function updateLevelScriptPaths(
  draft: ScriptDraft,
  context: ScriptContext,
  sourceScript: string,
  compiledScript: string,
): ScriptDraft {
  const nextDraft = ensureLevelEntry(draft, context);
  return {
    ...nextDraft,
    levels: {
      ...nextDraft.levels,
      levels: replaceLevelEntry(nextDraft.levels.levels, context.levelId, {
        sourceScript,
        compiledScript,
      }),
    },
  };
}

export function upsertTerrainItemBinding({
  context,
  draft,
  globals,
  itemIndex,
  item,
  scriptModule,
  behavior,
  tags,
  paramRefs,
}: UpsertTerrainItemBindingInput): ScriptDraft {
  const nextDraft = ensureLevelEntry(draft, context);
  const currentBindings = ensureBindingsManifest(nextDraft, context.levelId);
  const binding: ScriptBinding = {
    id: `terrain-${itemIndex.toString().padStart(3, "0")}`,
    target: {
      kind: "terrainItem",
      index: itemIndex,
      nativeType: item.type,
      nativeName: getItemName(globals, item.type),
      position: {
        x: item.x,
        z: item.z,
      },
      params: {
        flags: item.flags,
        p0: item.p0,
        p1: item.p1,
        p2: item.p2,
        p3: item.p3,
      },
    },
    scriptModule,
    behavior,
    hooks: ["object.onFrame"],
    tags: uniqueStrings(tags),
    paramRefs: uniqueStrings(paramRefs),
  };

  return {
    ...nextDraft,
    bindingsByLevel: {
      ...nextDraft.bindingsByLevel,
      [context.levelId]: {
        ...currentBindings,
        bindings: replaceBinding(currentBindings.bindings, binding),
      },
    },
  };
}

export function upsertSplineItemBinding({
  context,
  draft,
  globals,
  splineIndex,
  splineItemIndex,
  splineItem,
  scriptModule,
  behavior,
  tags,
  paramRefs,
}: UpsertSplineItemBindingInput): ScriptDraft {
  const nextDraft = ensureLevelEntry(draft, context);
  const currentBindings = ensureBindingsManifest(nextDraft, context.levelId);
  const binding: ScriptBinding = {
    id: `spline-${splineIndex.toString().padStart(2, "0")}-${splineItemIndex
      .toString()
      .padStart(3, "0")}`,
    target: {
      kind: "splineItem",
      splineIndex,
      itemIndex: splineItemIndex,
      nativeType: splineItem.type,
      nativeName: getSplineItemName(globals, splineItem.type),
      placement: splineItem.placement,
      params: {
        flags: splineItem.flags,
        p0: splineItem.p0,
        p1: splineItem.p1,
        p2: splineItem.p2,
        p3: splineItem.p3,
      },
    },
    scriptModule,
    behavior,
    hooks: ["object.onFrame"],
    tags: uniqueStrings(tags),
    paramRefs: uniqueStrings(paramRefs),
  };

  return {
    ...nextDraft,
    bindingsByLevel: {
      ...nextDraft.bindingsByLevel,
      [context.levelId]: {
        ...currentBindings,
        bindings: replaceBinding(currentBindings.bindings, binding),
      },
    },
  };
}

export function addOrUpdateCustomObjectDefinition({
  draft,
  definition,
}: AddCustomObjectDefinitionInput): ScriptDraft {
  const remainingObjects = draft.objects.objects.filter(
    (existingObject) => existingObject.id !== definition.id,
  );

  return {
    ...draft,
    objects: {
      ...draft.objects,
      objects: [...remainingObjects, definition],
    },
  };
}

export function addCustomObjectPlacement({
  context,
  draft,
  placement,
}: AddCustomObjectPlacementInput): ScriptDraft {
  const nextDraft = ensureLevelEntry(draft, context);
  const currentPlacements = ensurePlacementsManifest(nextDraft, context.levelId);
  return {
    ...nextDraft,
    placementsByLevel: {
      ...nextDraft.placementsByLevel,
      [context.levelId]: {
        ...currentPlacements,
        customObjects: [...currentPlacements.customObjects, placement],
      },
    },
  };
}

export function addOrUpdateParamDefinition({
  draft,
  definition,
}: AddParamDefinitionInput): ScriptDraft {
  const remainingParams = draft.params.params.filter(
    (existingParam) => existingParam.id !== definition.id,
  );
  return {
    ...draft,
    params: {
      ...draft.params,
      params: [...remainingParams, definition],
    },
  };
}

export function removeBinding(
  context: ScriptContext,
  draft: ScriptDraft,
  bindingId: string,
): ScriptDraft {
  const currentBindings = ensureBindingsManifest(draft, context.levelId);
  return {
    ...draft,
    bindingsByLevel: {
      ...draft.bindingsByLevel,
      [context.levelId]: {
        ...currentBindings,
        bindings: currentBindings.bindings.filter(
          (binding) => binding.id !== bindingId,
        ),
      },
    },
  };
}

export function removeCustomObjectDefinition(
  draft: ScriptDraft,
  definitionId: string,
): ScriptDraft {
  const nextPlacementsByLevel = Object.fromEntries(
    Object.entries(draft.placementsByLevel).map(([levelId, placements]) => [
      levelId,
      {
        ...placements,
        customObjects: placements.customObjects.filter(
          (placement) => placement.definitionId !== definitionId,
        ),
      },
    ]),
  );

  return {
    ...draft,
    placementsByLevel: nextPlacementsByLevel,
    objects: {
      ...draft.objects,
      objects: draft.objects.objects.filter(
        (objectDefinition) => objectDefinition.id !== definitionId,
      ),
    },
  };
}

export function removeCustomObjectPlacement(
  context: ScriptContext,
  draft: ScriptDraft,
  placementId: string,
): ScriptDraft {
  const currentPlacements = ensurePlacementsManifest(draft, context.levelId);
  return {
    ...draft,
    placementsByLevel: {
      ...draft.placementsByLevel,
      [context.levelId]: {
        ...currentPlacements,
        customObjects: currentPlacements.customObjects.filter(
          (placement) => placement.id !== placementId,
        ),
      },
    },
  };
}

export function removeParamDefinition(
  draft: ScriptDraft,
  paramId: string,
): ScriptDraft {
  return {
    ...draft,
    bindingsByLevel: Object.fromEntries(
      Object.entries(draft.bindingsByLevel).map(([levelId, bindings]) => [
        levelId,
        {
          ...bindings,
          bindings: bindings.bindings.map((binding) => ({
            ...binding,
            paramRefs: binding.paramRefs.filter((ref) => ref !== paramId),
          })),
        },
      ]),
    ),
    placementsByLevel: Object.fromEntries(
      Object.entries(draft.placementsByLevel).map(([levelId, placements]) => [
        levelId,
        {
          ...placements,
          customObjects: placements.customObjects.map((placement) => ({
            ...placement,
            paramRefs: placement.paramRefs.filter((ref) => ref !== paramId),
          })),
        },
      ]),
    ),
    objects: {
      ...draft.objects,
      objects: draft.objects.objects.map((objectDefinition) => ({
        ...objectDefinition,
        defaultParamRefs: objectDefinition.defaultParamRefs.filter(
          (ref) => ref !== paramId,
        ),
      })),
    },
    params: {
      ...draft.params,
      params: draft.params.params.filter((param) => param.id !== paramId),
    },
  };
}

export function getDefaultPlacementPosition(
  item: TerrainItem | null,
): { x: number; y: number; z: number } {
  if (item === null) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: item.x,
    y: 0,
    z: item.z,
  };
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function getSidecarFiles(
  draft: ScriptDraft,
  context: ScriptContext,
): ScriptSidecarFile[] {
  const bindingsManifest = ensureBindingsManifest(draft, context.levelId);
  const placementsManifest = ensurePlacementsManifest(draft, context.levelId);

  return [
    {
      path: "Data/Scripts/config/project.json",
      downloadName: "project.json",
      content: prettyJson(draft.project),
    },
    {
      path: "Data/Scripts/config/levels.json",
      downloadName: "levels.json",
      content: prettyJson(draft.levels),
    },
    {
      path: `Data/Scripts/config/bindings/${context.levelId}.json`,
      downloadName: `${context.levelId}.bindings.json`,
      content: prettyJson(bindingsManifest),
    },
    {
      path: `Data/Scripts/config/placements/${context.levelId}.json`,
      downloadName: `${context.levelId}.placements.json`,
      content: prettyJson(placementsManifest),
    },
    {
      path: "Data/Scripts/config/objects.json",
      downloadName: "objects.json",
      content: prettyJson(draft.objects),
    },
    {
      path: "Data/Scripts/config/params.json",
      downloadName: "params.json",
      content: prettyJson(draft.params),
    },
  ];
}