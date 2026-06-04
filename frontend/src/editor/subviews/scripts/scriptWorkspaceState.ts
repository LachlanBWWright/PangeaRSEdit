import { atom } from "jotai";
import { err, ok, Result } from "neverthrow";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { z } from "zod";
import ts from "typescript";
import { Game, type GlobalsInterface } from "@/data/globals/globals";
import type { PreviewVfsFile } from "@/editor/utils/gamePreviewRuntimeTypes";

export const scriptHookIdSchema = z.enum([
  "onLevelLoad",
  "onLevelStart",
  "onFrame",
  "onObjectFrame",
  "onLevelComplete",
  "onLevelUnload",
  "onTerrainItem",
  "onSplineItem",
  "onSceneLoad",
  "onAreaLoad",
  "onAreaStart",
  "onAreaFrame",
  "onAreaUnload",
  "onMapItem",
  "onRaceConfig",
  "onRaceStart",
  "onCheckpoint",
  "onLapComplete",
  "onPowerupCollected",
  "onRaceFinish",
]);

export type ScriptHookId = z.infer<typeof scriptHookIdSchema>;

const scriptTargetKindSchema = z.enum([
  "global",
  "terrainItem",
  "splineItem",
  "mapItem",
  "customObject",
]);

export type ScriptTargetKind = z.infer<typeof scriptTargetKindSchema>;

const scriptSeveritySchema = z.enum(["error", "warning"]);

export interface ScriptTagDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly targetKinds: readonly ScriptTargetKind[];
  readonly source: "game" | "behavior";
}

const scriptTagDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  targetKinds: z.array(scriptTargetKindSchema).min(1),
  source: z.enum(["game", "behavior"]),
});

export interface ScriptBehaviorDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  readonly targetKinds: readonly ScriptTargetKind[];
  readonly supportedHooks: readonly ScriptHookId[];
  readonly sourceFilePath: string;
  readonly previewSupport: "preview-ready" | "extended-only";
  readonly defaultTags: readonly string[];
  readonly contributedTags: readonly ScriptTagDefinition[];
  readonly template: string;
}

const scriptBehaviorDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  targetKinds: z.array(scriptTargetKindSchema).min(1),
  supportedHooks: z.array(scriptHookIdSchema),
  sourceFilePath: z.string().min(1),
  previewSupport: z.enum(["preview-ready", "extended-only"]),
  defaultTags: z.array(z.string()),
  contributedTags: z.array(scriptTagDefinitionSchema),
  template: z.string(),
});

const vector2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export interface ScriptTerrainBindingSignature {
  readonly itemType: number;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly flags: number;
  readonly params: readonly number[];
}

const scriptTerrainBindingSignatureSchema = z.object({
  itemType: z.number().int(),
  position: vector3Schema,
  flags: z.number().int(),
  params: z.array(z.number().int()),
});

export interface ScriptSplineBindingSignature {
  readonly itemType: number;
  readonly splineNum: number;
  readonly placement: number;
  readonly params: readonly number[];
}

const scriptSplineBindingSignatureSchema = z.object({
  itemType: z.number().int(),
  splineNum: z.number().int(),
  placement: z.number(),
  params: z.array(z.number().int()),
});

export interface ScriptMapItemSignature {
  readonly itemType: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly params: readonly number[];
  readonly sceneName?: string;
}

const scriptMapItemSignatureSchema = z.object({
  itemType: z.number().int(),
  position: vector2Schema,
  params: z.array(z.number().int()),
  sceneName: z.string().optional(),
});

export interface ScriptAssignmentBase {
  readonly id: string;
  readonly behaviorId: string;
  readonly label: string;
  readonly sourceFilePath: string;
  readonly tags: readonly string[];
  readonly paramRefs: readonly string[];
  readonly compatibility: "preview-ready" | "extended-only";
}

export interface ScriptGlobalAssignment extends ScriptAssignmentBase {
  readonly hookId: ScriptHookId;
}

const scriptGlobalAssignmentSchema = z.object({
  id: z.string().min(1),
  behaviorId: z.string().min(1),
  label: z.string().min(1),
  sourceFilePath: z.string().min(1),
  tags: z.array(z.string()),
  paramRefs: z.array(z.string()),
  compatibility: z.enum(["preview-ready", "extended-only"]),
  hookId: scriptHookIdSchema,
});

export interface ScriptTerrainBinding extends ScriptAssignmentBase {
  readonly kind: "terrainItem";
  readonly signature: ScriptTerrainBindingSignature;
}

const scriptTerrainBindingSchema = z.object({
  id: z.string().min(1),
  behaviorId: z.string().min(1),
  label: z.string().min(1),
  sourceFilePath: z.string().min(1),
  tags: z.array(z.string()),
  paramRefs: z.array(z.string()),
  compatibility: z.enum(["preview-ready", "extended-only"]),
  kind: z.literal("terrainItem"),
  signature: scriptTerrainBindingSignatureSchema,
});

export interface ScriptSplineBinding extends ScriptAssignmentBase {
  readonly kind: "splineItem";
  readonly signature: ScriptSplineBindingSignature;
}

const scriptSplineBindingSchema = z.object({
  id: z.string().min(1),
  behaviorId: z.string().min(1),
  label: z.string().min(1),
  sourceFilePath: z.string().min(1),
  tags: z.array(z.string()),
  paramRefs: z.array(z.string()),
  compatibility: z.enum(["preview-ready", "extended-only"]),
  kind: z.literal("splineItem"),
  signature: scriptSplineBindingSignatureSchema,
});

export interface ScriptMapItemBinding extends ScriptAssignmentBase {
  readonly kind: "mapItem";
  readonly signature: ScriptMapItemSignature;
}

const scriptMapItemBindingSchema = z.object({
  id: z.string().min(1),
  behaviorId: z.string().min(1),
  label: z.string().min(1),
  sourceFilePath: z.string().min(1),
  tags: z.array(z.string()),
  paramRefs: z.array(z.string()),
  compatibility: z.enum(["preview-ready", "extended-only"]),
  kind: z.literal("mapItem"),
  signature: scriptMapItemSignatureSchema,
});

export interface ScriptParameterDefinition {
  readonly id: string;
  readonly label: string;
  readonly type: "number" | "boolean" | "string";
  readonly description: string;
  readonly defaultValue: string;
}

const scriptParameterDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["number", "boolean", "string"]),
  description: z.string().min(1),
  defaultValue: z.string(),
});

export interface ScriptCustomObjectDefinition {
  readonly id: string;
  readonly label: string;
  readonly sourceFilePath: string;
  readonly exportName: string;
  readonly tags: readonly string[];
  readonly compatibility: "preview-ready" | "extended-only";
  readonly description: string;
}

const scriptCustomObjectDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sourceFilePath: z.string().min(1),
  exportName: z.string().min(1),
  tags: z.array(z.string()),
  compatibility: z.enum(["preview-ready", "extended-only"]),
  description: z.string().min(1),
});

export interface ScriptCustomObjectPlacement {
  readonly id: string;
  readonly objectId: string;
  readonly label: string;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly levelKey: string;
}

const scriptCustomObjectPlacementSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  label: z.string().min(1),
  position: vector3Schema,
  levelKey: z.string().min(1),
});

export interface ScriptSourceFile {
  readonly path: string;
  readonly content: string;
  readonly savedContent: string;
  readonly language: "typescript" | "javascript";
  readonly readOnly: boolean;
  readonly role: "generated-entry" | "generated-assignment" | "user";
  readonly ownerId?: string;
}

export interface ScriptCompiledFile {
  readonly path: string;
  readonly content: string;
  readonly sourcePath: string;
}

export interface ScriptDiagnostic {
  readonly severity: z.infer<typeof scriptSeveritySchema>;
  readonly message: string;
  readonly code: number | string;
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
}

const scriptDiagnosticSchema = z.object({
  severity: scriptSeveritySchema,
  message: z.string().min(1),
  code: z.union([z.number(), z.string()]),
  filePath: z.string().min(1),
  line: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
});

export interface ScriptAssetFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sourceName: string;
}

export interface ScriptLevelState {
  readonly globalHooks: readonly ScriptGlobalAssignment[];
  readonly terrainBindings: readonly ScriptTerrainBinding[];
  readonly splineBindings: readonly ScriptSplineBinding[];
  readonly mapItemBindings: readonly ScriptMapItemBinding[];
  readonly customPlacements: readonly ScriptCustomObjectPlacement[];
}

const scriptLevelStateSchema = z.object({
  globalHooks: z.array(scriptGlobalAssignmentSchema),
  terrainBindings: z.array(scriptTerrainBindingSchema),
  splineBindings: z.array(scriptSplineBindingSchema),
  mapItemBindings: z.array(scriptMapItemBindingSchema),
  customPlacements: z.array(scriptCustomObjectPlacementSchema),
});

export interface ScriptWorkspaceContext {
  readonly gameId: string;
  readonly gameLabel: string;
  readonly levelNumber: number | null;
  readonly levelKey: string;
  readonly supportedHooks: readonly ScriptHookId[];
  readonly allowedTags: readonly ScriptTagDefinition[];
}

export interface ScriptWorkspaceState {
  readonly projectVersion: 1;
  readonly context: ScriptWorkspaceContext;
  readonly activeFilePath: string;
  readonly behaviorCatalog: readonly ScriptBehaviorDefinition[];
  readonly moduleOrder: readonly string[];
  readonly sourceFiles: Readonly<Record<string, ScriptSourceFile>>;
  readonly compiledFiles: Readonly<Record<string, ScriptCompiledFile>>;
  readonly customObjects: readonly ScriptCustomObjectDefinition[];
  readonly params: readonly ScriptParameterDefinition[];
  readonly assets: Readonly<Record<string, ScriptAssetFile>>;
  readonly diagnostics: readonly ScriptDiagnostic[];
  readonly statusLog: readonly string[];
  readonly sampleId: string | null;
  readonly levels: Readonly<Record<string, ScriptLevelState>>;
}

const scriptProjectSchema = z.object({
  schemaVersion: z.literal(1),
  gameId: z.string().min(1),
  entryCompiledPath: z.string().min(1),
  editor: z.object({
    activeFilePath: z.string().min(1),
    moduleOrder: z.array(z.string().min(1)),
    behaviorCatalog: z.array(scriptBehaviorDefinitionSchema),
    diagnostics: z.array(scriptDiagnosticSchema),
    levels: z.record(z.string(), scriptLevelStateSchema),
    sampleId: z.string().nullable(),
    statusLog: z.array(z.string()),
  }),
});

const scriptBindingsFileSchema = z.object({
  schemaVersion: z.literal(1),
  terrainBindings: z.array(scriptTerrainBindingSchema),
  splineBindings: z.array(scriptSplineBindingSchema),
  mapItemBindings: z.array(scriptMapItemBindingSchema),
});

const scriptPlacementsFileSchema = z.object({
  schemaVersion: z.literal(1),
  placements: z.array(scriptCustomObjectPlacementSchema),
});

const scriptObjectsFileSchema = z.object({
  schemaVersion: z.literal(1),
  objects: z.array(scriptCustomObjectDefinitionSchema),
});

const scriptParamsFileSchema = z.object({
  schemaVersion: z.literal(1),
  params: z.array(scriptParameterDefinitionSchema),
});

const runtimeLevelConfigSchema = z.object({
  script: z.string().min(1),
  extraNativeItems: z.array(z.string()).default([]),
  itemOverrides: z.array(
    z.object({
      from: z.number().int(),
      to: z.number().int(),
    }),
  ).default([]),
});

const runtimeLevelsSchema = z.object({
  version: z.literal(1),
  levels: z.record(z.string(), runtimeLevelConfigSchema),
});

const GENERATED_ENTRY_PATH = "Data/Scripts/src/main.ts";
const USER_BOOTSTRAP_PATH = "Data/Scripts/src/user.ts";
const BUNDLED_RUNTIME_PATH = "Data/Scripts/dist/main.js";

function defaultLevelState(): ScriptLevelState {
  return {
    globalHooks: [],
    terrainBindings: [],
    splineBindings: [],
    mapItemBindings: [],
    customPlacements: [],
  };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return slug.length > 0 ? slug : "script";
}

function buildAssignmentId(prefix: string, value: string): string {
  return `${prefix}-${slugify(value)}`;
}

function inferLanguage(path: string): "typescript" | "javascript" {
  return path.endsWith(".js") ? "javascript" : "typescript";
}

function encodeJson(value: unknown): Uint8Array {
  return strToU8(`${JSON.stringify(value, null, 2)}\n`);
}

function encodeText(value: string): Uint8Array {
  return strToU8(value);
}

function toEditorRelativePath(path: string): string {
  return path.replace(/^Data\/Scripts\/src\//, "./");
}

function toBundleModuleId(path: string): string {
  return path;
}

function addStatusLog(
  state: ScriptWorkspaceState,
  message: string,
): ScriptWorkspaceState {
  return {
    ...state,
    statusLog: [...state.statusLog, message].slice(-20),
  };
}

function createSourceFile(
  path: string,
  content: string,
  role: ScriptSourceFile["role"],
  ownerId?: string,
): ScriptSourceFile {
  return {
    path,
    content,
    savedContent: content,
    language: inferLanguage(path),
    readOnly: role === "generated-entry",
    role,
    ownerId,
  };
}

function replaceToken(template: string, token: string, value: string): string {
  return template.split(token).join(value);
}

function buildTerrainPredicate(signature: ScriptTerrainBindingSignature): string {
  return [
    `ctx.itemType === ${String(signature.itemType)}`,
    `ctx.position.x === ${String(signature.position.x)}`,
    `ctx.position.y === ${String(signature.position.y)}`,
    `ctx.position.z === ${String(signature.position.z)}`,
    `ctx.flags === ${String(signature.flags)}`,
    `ctx.params.length === ${String(signature.params.length)}`,
    ...signature.params.map(
      (param, index) => `ctx.params[${String(index)}] === ${String(param)}`,
    ),
  ].join(" && ");
}

function buildSplinePredicate(signature: ScriptSplineBindingSignature): string {
  return [
    `ctx.itemType === ${String(signature.itemType)}`,
    `ctx.splineNum === ${String(signature.splineNum)}`,
    `ctx.placement === ${String(signature.placement)}`,
    `ctx.params.length === ${String(signature.params.length)}`,
    ...signature.params.map(
      (param, index) => `ctx.params[${String(index)}] === ${String(param)}`,
    ),
  ].join(" && ");
}

function buildMapPredicate(signature: ScriptMapItemSignature): string {
  const sceneCheck = signature.sceneName
    ? [`ctx.gameName === ctx.gameName`, `true`]
    : ["true"];
  return [
    `ctx.itemType === ${String(signature.itemType)}`,
    `ctx.position.x === ${String(signature.position.x)}`,
    `ctx.position.y === ${String(signature.position.y)}`,
    `ctx.params.length === ${String(signature.params.length)}`,
    ...signature.params.map(
      (param, index) => `ctx.params[${String(index)}] === ${String(param)}`,
    ),
    ...sceneCheck,
  ].join(" && ");
}

function buildBaseRuntimeTemplate(): string {
  return [
    "declare const pangea: PangeaApi;",
    "declare function require(path: string): unknown;",
    "",
    "export function onLevelStart(ctx: LevelContext): void {",
    '  pangea.log.info(`Scripts ready for level ${String(ctx.levelNum)}`);',
    "}",
    "",
  ].join("\n");
}

function getAdventureHooks(): readonly ScriptHookId[] {
  return [
    "onLevelLoad",
    "onLevelStart",
    "onFrame",
    "onObjectFrame",
    "onLevelComplete",
    "onLevelUnload",
    "onTerrainItem",
    "onSplineItem",
  ];
}

function getMightyMikeHooks(): readonly ScriptHookId[] {
  return [
    "onSceneLoad",
    "onAreaLoad",
    "onAreaStart",
    "onAreaFrame",
    "onObjectFrame",
    "onMapItem",
    "onAreaUnload",
  ];
}

function getRaceHooks(): readonly ScriptHookId[] {
  return [
    "onRaceConfig",
    "onRaceStart",
    "onObjectFrame",
    "onCheckpoint",
    "onLapComplete",
    "onPowerupCollected",
    "onRaceFinish",
  ];
}

function createTag(
  id: string,
  label: string,
  description: string,
  targetKinds: readonly ScriptTargetKind[],
  source: "game" | "behavior",
): ScriptTagDefinition {
  return { id, label, description, targetKinds, source };
}

function getGameTags(gameId: string): readonly ScriptTagDefinition[] {
  if (gameId === "OttoMatic-Android") {
    return [
      createTag(
        "ottomatic.human",
        "Otto Human",
        "Native Otto humans and scientists.",
        ["global", "customObject"],
        "game",
      ),
      createTag(
        "ottomatic.human.scientist",
        "Scientist",
        "Scientist rescue targets.",
        ["global", "customObject"],
        "game",
      ),
      createTag(
        "ottomatic.enemy.robot",
        "Robot",
        "Otto combat robots.",
        ["global"],
        "game",
      ),
    ];
  }

  if (gameId === "Bugdom2-Android") {
    return [
      createTag(
        "bugdom2.powerup",
        "Bugdom 2 Powerup",
        "Native Bugdom 2 pickups.",
        ["terrainItem", "global"],
        "game",
      ),
      createTag(
        "bugdom2.collectible",
        "Collectible",
        "Map collectibles and rewards.",
        ["terrainItem", "global"],
        "game",
      ),
    ];
  }

  return [
    createTag(
      `${slugify(gameId)}.native`,
      "Native",
      "Native gameplay objects registered by the port.",
      ["global", "terrainItem", "splineItem", "mapItem"],
      "game",
    ),
  ];
}

function buildBehaviorCatalog(gameId: string): readonly ScriptBehaviorDefinition[] {
  const sharedBehaviors: readonly ScriptBehaviorDefinition[] = [
    {
      id: "sample.log-level-start",
      label: "Log Level Start",
      description: "Logs a message when the current level starts.",
      category: "Samples",
      targetKinds: ["global"],
      supportedHooks: ["onLevelStart", "onAreaStart", "onRaceStart"],
      sourceFilePath: "Data/Scripts/src/globals/log-level-start.ts",
      previewSupport: "preview-ready",
      defaultTags: [],
      contributedTags: [],
      template: [
        "export function __HOOK__(ctx: LevelContext): void {",
        '  pangea.log.info("LEVEL_EDITOR_SCRIPTING: start hook fired");',
        "}",
        "",
      ].join("\n"),
    },
    {
      id: "sample.item-trigger-logger",
      label: "Item Trigger Logger",
      description: "Logs when the selected native item spawns.",
      category: "Samples",
      targetKinds: ["terrainItem", "splineItem", "mapItem"],
      supportedHooks: ["onTerrainItem", "onSplineItem", "onMapItem"],
      sourceFilePath: "Data/Scripts/src/bindings/item-trigger.ts",
      previewSupport: "preview-ready",
      defaultTags: [],
      contributedTags: [],
      template: [
        "const matchesTarget = (ctx: __CONTEXT_TYPE__): boolean => {",
        "  return __PREDICATE__;",
        "};",
        "",
        "export function __HOOK__(ctx: __CONTEXT_TYPE__): ItemSpawnResult {",
        "  if (!matchesTarget(ctx)) {",
        "    return { handled: false };",
        "  }",
        '  pangea.log.info("LEVEL_EDITOR_SCRIPTING: matched native item binding");',
        "  return { handled: false };",
        "}",
        "",
      ].join("\n"),
    },
    {
      id: "sample.hover-beacon",
      label: "Hover Beacon",
      description: "A simple scripted object that bobs in place.",
      category: "Samples",
      targetKinds: ["customObject"],
      supportedHooks: ["onLevelStart"],
      sourceFilePath: "Data/Scripts/src/objects/hover-beacon.ts",
      previewSupport: "preview-ready",
      defaultTags: ["editor.custom.hoverBeacon"],
      contributedTags: [
        createTag(
          "editor.custom.hoverBeacon",
          "Hover Beacon",
          "Sample scripted object placed by the Scripts workspace.",
          ["customObject", "global"],
          "behavior",
        ),
      ],
      template: [
        "export const hoverBeacon = defineScriptedObject({",
        "  onUpdate(self, ctx) {",
        "    const current = pangea.object.position(self.handle);",
        "    if (!current) {",
        "      return;",
        "    }",
        "    const wave = Math.sin(ctx.levelTimeSeconds * 4) * 16;",
        "    pangea.object.setPosition(self.handle, {",
        "      x: current.x,",
        "      y: current.y + wave * 0.02,",
        "      z: current.z,",
        "    });",
        "  },",
        "});",
        "",
      ].join("\n"),
    },
  ];

  if (gameId === "OttoMatic-Android") {
    return [
      ...sharedBehaviors,
      {
        id: "otto.humans-jump",
        label: "Otto Humans Jump",
        description: "Applies a bobbing offset to Otto human rescue targets.",
        category: "Samples",
        targetKinds: ["global"],
        supportedHooks: ["onObjectFrame"],
        sourceFilePath: "Data/Scripts/src/globals/otto-humans-jump.ts",
        previewSupport: "preview-ready",
        defaultTags: ["ottomatic.human"],
        contributedTags: [],
        template: [
          "const HUMAN_TAG = \"ottomatic.human\";",
          "const SCIENTIST_TAG = \"ottomatic.human.scientist\";",
          "",
          "function hasTag(tags: readonly string[], tag: string): boolean {",
          "  return tags.includes(tag);",
          "}",
          "",
          "function getBobHeight(tags: readonly string[]): number {",
          "  return hasTag(tags, SCIENTIST_TAG) ? 56 : 32;",
          "}",
          "",
          "export function onObjectFrame(ctx: ObjectFrameContext): ObjectFrameResult | void {",
          "  if (!hasTag(ctx.tags, HUMAN_TAG)) {",
          "    return;",
          "  }",
          "",
          "  return {",
          "    positionOffset: {",
          "      x: 0,",
          "      y: Math.sin(ctx.levelTimeSeconds * 8) * getBobHeight(ctx.tags),",
          "      z: 0,",
          "    },",
          "  };",
          "}",
          "",
        ].join("\n"),
      },
    ];
  }

  return sharedBehaviors;
}

export interface ScriptSampleDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly createState: (context: ScriptWorkspaceContext) => ScriptWorkspaceState;
}

function buildWorkspaceId(context: ScriptWorkspaceContext): string {
  return `${context.gameId}:${context.levelKey}`;
}

function levelLabelFromContext(context: ScriptWorkspaceContext): string {
  if (context.levelNumber === null) {
    return context.levelKey;
  }

  return `level-${String(context.levelNumber)}`;
}

function buildGeneratedEntryModule(
  state: ScriptWorkspaceState,
  context: ScriptWorkspaceContext,
): string {
  const supportedHooks = context.supportedHooks;
  const runtimeModules = state.moduleOrder.filter(
    (path) => path !== GENERATED_ENTRY_PATH,
  );
  const customObjectExports = state.customObjects
    .map((objectDefinition, index) => {
      const requireVar = `__customObjectModule${String(index)}`;
      return [
        `const ${requireVar} = require(${JSON.stringify(toEditorRelativePath(objectDefinition.sourceFilePath))}) as Record<string, unknown>;`,
        `if (typeof ${requireVar}[${JSON.stringify(objectDefinition.exportName)}] !== "undefined") {`,
        `  exports[${JSON.stringify(objectDefinition.exportName)}] = ${requireVar}[${JSON.stringify(objectDefinition.exportName)}];`,
        "}",
      ].join("\n");
    })
    .join("\n");

  const placementBlocks = state.levels[context.levelKey]?.customPlacements ?? [];
  const placementSetup = placementBlocks
    .map((placement, index) => {
      const objectDefinition = state.customObjects.find(
        (candidate) => candidate.id === placement.objectId,
      );
      if (!objectDefinition) {
        return "";
      }

      return [
        `const __placedModule${String(index)} = require(${JSON.stringify(toEditorRelativePath(objectDefinition.sourceFilePath))}) as Record<string, unknown>;`,
        `exports[${JSON.stringify(objectDefinition.exportName)}] = __placedModule${String(index)}[${JSON.stringify(objectDefinition.exportName)}];`,
      ].join("\n");
    })
    .filter((value) => value.length > 0)
    .join("\n");

  const requires = runtimeModules
    .map(
      (path, index) =>
        `const __module${String(index)} = require(${JSON.stringify(toEditorRelativePath(path))}) as Record<string, unknown>;`,
    )
    .join("\n");

  const moduleArray = runtimeModules
    .map((_, index) => `__module${String(index)}`)
    .join(", ");

  const hookDispatchers = supportedHooks
    .map((hookId) => {
      const callResult =
        hookId === "onTerrainItem" ||
        hookId === "onSplineItem" ||
        hookId === "onMapItem"
          ? [
              "  for (const candidate of __modules) {",
              `    const hook = candidate[${JSON.stringify(hookId)}];`,
              "    if (typeof hook !== \"function\") {",
              "      continue;",
              "    }",
              `    const result = hook(ctx) as ItemSpawnResult | void;`,
              "    if (result && result.handled) {",
              "      return result;",
              "    }",
              "  }",
              '  return { handled: false };',
            ].join("\n")
          : hookId === "onObjectFrame"
            ? [
                "  for (const candidate of __modules) {",
                `    const hook = candidate[${JSON.stringify(hookId)}];`,
                "    if (typeof hook !== \"function\") {",
                "      continue;",
                "    }",
                "    const result = hook(ctx) as ObjectFrameResult | void;",
                "    if (result) {",
                "      return result;",
                "    }",
                "  }",
              ].join("\n")
            : [
                "  for (const candidate of __modules) {",
                `    const hook = candidate[${JSON.stringify(hookId)}];`,
                "    if (typeof hook !== \"function\") {",
                "      continue;",
                "    }",
                "    hook(ctx);",
                "  }",
              ].join("\n");

      return [
        `export function ${hookId}(ctx: unknown): unknown {`,
        callResult,
        "}",
      ].join("\n");
    })
    .join("\n\n");

  const placementSpawner = placementBlocks.length === 0
    ? ""
    : [
        "export function onLevelStart(ctx: LevelContext): void {",
        "  for (const candidate of __modules) {",
        '    const hook = candidate["onLevelStart"];',
        "    if (typeof hook === \"function\") {",
        "      hook(ctx);",
        "    }",
        "  }",
        ...placementBlocks.map((placement) => {
          const objectDefinition = state.customObjects.find(
            (candidate) => candidate.id === placement.objectId,
          );
          if (!objectDefinition) {
            return "";
          }

          return `  pangea.spawn.scripted(${JSON.stringify(placement.objectId)}, ${JSON.stringify(placement.position)});`;
        }),
        "}",
      ].filter((line) => line.length > 0).join("\n");

  return [
    "declare const pangea: PangeaApi;",
    "declare function require(path: string): Record<string, unknown>;",
    "",
    requires,
    "",
    `const __modules: readonly Record<string, unknown>[] = [${moduleArray}];`,
    customObjectExports,
    placementSetup,
    "",
    hookDispatchers,
    placementSpawner,
    "",
  ].join("\n");
}

function getCompiledModulePath(sourcePath: string): string {
  const distPath = sourcePath.replace("Data/Scripts/src/", "Data/Scripts/dist/modules/");
  if (distPath.endsWith(".ts")) {
    return `${distPath.slice(0, -3)}.js`;
  }
  return distPath.endsWith(".js") ? distPath : `${distPath}.js`;
}

function buildBundle(
  transpiledModules: Readonly<Record<string, string>>,
  entryId: string,
): string {
  const moduleFactories = Object.entries(transpiledModules)
    .map(
      ([path, output]) =>
        `${JSON.stringify(path)}: function(module, exports, require, globalThis) {\n${output}\n}`,
    )
    .join(",\n");

  return [
    "(function() {",
    "  const __moduleFactories = {",
    moduleFactories,
    "  };",
    "  const __moduleCache = {};",
    "",
    "  function __resolve(request, fromId) {",
    "    if (request.startsWith(\"./\") || request.startsWith(\"../\")) {",
    `      const base = ${JSON.stringify(entryId)} === fromId ? fromId : fromId;`,
    "      const normalized = (function(baseId, relativeId) {",
    "        const baseParts = baseId.split('/');",
    "        baseParts.pop();",
    "        const requestParts = relativeId.split('/');",
    "        const resolvedParts = baseParts.slice();",
    "        for (const part of requestParts) {",
    "          if (!part || part === '.') {",
    "            continue;",
    "          }",
    "          if (part === '..') {",
    "            if (resolvedParts.length > 0) {",
    "              resolvedParts.pop();",
    "            }",
    "            continue;",
    "          }",
    "          resolvedParts.push(part);",
    "        }",
    "        return resolvedParts.join('/');",
    "      })(base, request);",
    "",
    "      const candidates = [",
    "        normalized,",
    "        `${normalized}.ts`,",
    "        `${normalized}.js`,",
    "        `${normalized}/index.ts`,",
    "        `${normalized}/index.js`,",
    "      ];",
    "",
    "      for (const candidate of candidates) {",
    "        if (__moduleFactories[candidate]) {",
    "          return candidate;",
    "        }",
    "      }",
    "    }",
    "",
    "    return request;",
    "  }",
    "",
    "  function __load(id) {",
    "    const existing = __moduleCache[id];",
    "    if (existing) {",
    "      return existing.exports;",
    "    }",
    "",
    "    const factory = __moduleFactories[id];",
    "    if (!factory) {",
    "      if (globalThis.pangea && globalThis.pangea.log) {",
    "        globalThis.pangea.log.error(`LEVEL_EDITOR_SCRIPTING: unresolved module ${id}`);",
    "      }",
    "      return {};",
    "    }",
    "",
    "    const module = { exports: {} };",
    "    __moduleCache[id] = module;",
    "    factory(module, module.exports, function(request) {",
    "      return __load(__resolve(request, id));",
    "    }, globalThis);",
    "    return module.exports;",
    "  }",
    "",
    `  const __entryExports = __load(${JSON.stringify(entryId)});`,
    "  if (typeof __entryExports === 'object' && __entryExports !== null) {",
    "    for (const key of Object.keys(__entryExports)) {",
    "      if (key === '__esModule') {",
    "        continue;",
    "      }",
    "      const value = __entryExports[key];",
    "      if (typeof globalThis.exports === 'object' && globalThis.exports !== null) {",
    "        globalThis.exports[key] = value;",
    "      }",
    "      if (typeof globalThis.module === 'object' && globalThis.module !== null) {",
    "        const moduleObject = globalThis.module;",
    "        if (typeof moduleObject.exports === 'object' && moduleObject.exports !== null) {",
    "          moduleObject.exports[key] = value;",
    "        }",
    "      }",
    "      globalThis[key] = value;",
    "    }",
    "  }",
    "})();",
    "",
  ].join("\n");
}

function compileModule(
  sourceFile: ScriptSourceFile,
): Result<{ readonly output: string; readonly diagnostics: readonly ScriptDiagnostic[] }, string> {
  const compileResult = Result.fromThrowable(
    () =>
      ts.transpileModule(sourceFile.content, {
        fileName: sourceFile.path,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2019,
          module: ts.ModuleKind.CommonJS,
          isolatedModules: true,
          esModuleInterop: false,
          strict: true,
          noEmitHelpers: true,
        },
      }),
    () => `Failed to compile ${sourceFile.path}`,
  )();

  if (compileResult.isErr()) {
    return err(compileResult.error);
  }

  const diagnostics = (compileResult.value.diagnostics ?? []).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    const location = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    return {
      severity: diagnostic.category === ts.DiagnosticCategory.Error ? "error" : "warning",
      message,
      code: diagnostic.code,
      filePath: sourceFile.path,
      line: (location?.line ?? 0) + 1,
      column: (location?.character ?? 0) + 1,
    } satisfies ScriptDiagnostic;
  });

  return ok({
    output: compileResult.value.outputText,
    diagnostics,
  });
}

function buildRequireDiagnostics(
  sourcePath: string,
  output: string,
): readonly ScriptDiagnostic[] {
  const requirePattern = /require\((['"])([^'"]+)\1\)/g;
  const diagnostics: ScriptDiagnostic[] = [];
  for (const match of output.matchAll(requirePattern)) {
    const request = match[2] ?? "";
    if (request.startsWith("./") || request.startsWith("../")) {
      continue;
    }
    diagnostics.push({
      severity: "warning",
      message:
        "Only relative require paths are bundled in the editor preview. Use global pangea types instead of package imports.",
      code: "preview.require",
      filePath: sourcePath,
      line: 1,
      column: 1,
    });
  }
  return diagnostics;
}

function cloneLevelMap(
  levels: Readonly<Record<string, ScriptLevelState>>,
): Record<string, z.infer<typeof scriptLevelStateSchema>> {
  return Object.fromEntries(
    Object.entries(levels).map(([key, value]) => [
      key,
      cloneLevelState(value),
    ]),
  );
}

function cloneTagDefinition(
  tag: ScriptTagDefinition,
): z.infer<typeof scriptTagDefinitionSchema> {
  return {
    id: tag.id,
    label: tag.label,
    description: tag.description,
    targetKinds: [...tag.targetKinds],
    source: tag.source,
  };
}

function cloneBehaviorDefinition(
  behavior: ScriptBehaviorDefinition,
): z.infer<typeof scriptBehaviorDefinitionSchema> {
  return {
    id: behavior.id,
    label: behavior.label,
    description: behavior.description,
    category: behavior.category,
    targetKinds: [...behavior.targetKinds],
    supportedHooks: [...behavior.supportedHooks],
    sourceFilePath: behavior.sourceFilePath,
    previewSupport: behavior.previewSupport,
    defaultTags: [...behavior.defaultTags],
    contributedTags: behavior.contributedTags.map(cloneTagDefinition),
    template: behavior.template,
  };
}

function cloneGlobalAssignment(
  assignment: ScriptGlobalAssignment,
): z.infer<typeof scriptGlobalAssignmentSchema> {
  return {
    id: assignment.id,
    behaviorId: assignment.behaviorId,
    label: assignment.label,
    sourceFilePath: assignment.sourceFilePath,
    tags: [...assignment.tags],
    paramRefs: [...assignment.paramRefs],
    compatibility: assignment.compatibility,
    hookId: assignment.hookId,
  };
}

function cloneTerrainBinding(
  binding: ScriptTerrainBinding,
): z.infer<typeof scriptTerrainBindingSchema> {
  return {
    id: binding.id,
    behaviorId: binding.behaviorId,
    label: binding.label,
    sourceFilePath: binding.sourceFilePath,
    tags: [...binding.tags],
    paramRefs: [...binding.paramRefs],
    compatibility: binding.compatibility,
    kind: binding.kind,
    signature: {
      itemType: binding.signature.itemType,
      position: { ...binding.signature.position },
      flags: binding.signature.flags,
      params: [...binding.signature.params],
    },
  };
}

function cloneSplineBinding(
  binding: ScriptSplineBinding,
): z.infer<typeof scriptSplineBindingSchema> {
  return {
    id: binding.id,
    behaviorId: binding.behaviorId,
    label: binding.label,
    sourceFilePath: binding.sourceFilePath,
    tags: [...binding.tags],
    paramRefs: [...binding.paramRefs],
    compatibility: binding.compatibility,
    kind: binding.kind,
    signature: {
      itemType: binding.signature.itemType,
      splineNum: binding.signature.splineNum,
      placement: binding.signature.placement,
      params: [...binding.signature.params],
    },
  };
}

function cloneMapItemBinding(
  binding: ScriptMapItemBinding,
): z.infer<typeof scriptMapItemBindingSchema> {
  return {
    id: binding.id,
    behaviorId: binding.behaviorId,
    label: binding.label,
    sourceFilePath: binding.sourceFilePath,
    tags: [...binding.tags],
    paramRefs: [...binding.paramRefs],
    compatibility: binding.compatibility,
    kind: binding.kind,
    signature: {
      itemType: binding.signature.itemType,
      position: { ...binding.signature.position },
      params: [...binding.signature.params],
      sceneName: binding.signature.sceneName,
    },
  };
}

function cloneCustomPlacement(
  placement: ScriptCustomObjectPlacement,
): z.infer<typeof scriptCustomObjectPlacementSchema> {
  return {
    id: placement.id,
    objectId: placement.objectId,
    label: placement.label,
    position: { ...placement.position },
    levelKey: placement.levelKey,
  };
}

function cloneLevelState(
  levelState: ScriptLevelState,
): z.infer<typeof scriptLevelStateSchema> {
  return {
    globalHooks: levelState.globalHooks.map(cloneGlobalAssignment),
    terrainBindings: levelState.terrainBindings.map(cloneTerrainBinding),
    splineBindings: levelState.splineBindings.map(cloneSplineBinding),
    mapItemBindings: levelState.mapItemBindings.map(cloneMapItemBinding),
    customPlacements: levelState.customPlacements.map(cloneCustomPlacement),
  };
}

function cloneCustomObjectDefinition(
  objectDefinition: ScriptCustomObjectDefinition,
): z.infer<typeof scriptCustomObjectDefinitionSchema> {
  return {
    id: objectDefinition.id,
    label: objectDefinition.label,
    sourceFilePath: objectDefinition.sourceFilePath,
    exportName: objectDefinition.exportName,
    tags: [...objectDefinition.tags],
    compatibility: objectDefinition.compatibility,
    description: objectDefinition.description,
  };
}

function cloneParameterDefinition(
  param: ScriptParameterDefinition,
): z.infer<typeof scriptParameterDefinitionSchema> {
  return {
    id: param.id,
    label: param.label,
    type: param.type,
    description: param.description,
    defaultValue: param.defaultValue,
  };
}

function refreshGeneratedEntry(
  state: ScriptWorkspaceState,
  context: ScriptWorkspaceContext,
): ScriptWorkspaceState {
  const sourceFiles: Record<string, ScriptSourceFile> = { ...state.sourceFiles };
  sourceFiles[GENERATED_ENTRY_PATH] = createSourceFile(
    GENERATED_ENTRY_PATH,
    buildGeneratedEntryModule(state, context),
    "generated-entry",
  );

  const moduleOrder = state.moduleOrder.includes(GENERATED_ENTRY_PATH)
    ? state.moduleOrder
    : [GENERATED_ENTRY_PATH, ...state.moduleOrder];

  return {
    ...state,
    sourceFiles,
    moduleOrder,
  };
}

function createEmptyWorkspace(context: ScriptWorkspaceContext): ScriptWorkspaceState {
  const sourceFiles: Record<string, ScriptSourceFile> = {
    [USER_BOOTSTRAP_PATH]: createSourceFile(
      USER_BOOTSTRAP_PATH,
      buildBaseRuntimeTemplate(),
      "user",
    ),
  };

  const initialState: ScriptWorkspaceState = {
    projectVersion: 1,
    context,
    activeFilePath: USER_BOOTSTRAP_PATH,
    behaviorCatalog: buildBehaviorCatalog(context.gameId),
    moduleOrder: [USER_BOOTSTRAP_PATH],
    sourceFiles,
    compiledFiles: {},
    customObjects: [],
    params: [],
    assets: {},
    diagnostics: [],
    statusLog: ["Script workspace initialized"],
    sampleId: null,
    levels: {
      [context.levelKey]: defaultLevelState(),
    },
  };

  return refreshGeneratedEntry(initialState, context);
}

export function createScriptWorkspaceContext(
  globals: GlobalsInterface,
  levelNumber: number | null,
): ScriptWorkspaceContext {
  const gameId = (() => {
    switch (globals.GAME_TYPE) {
      case Game.OTTO_MATIC:
        return "OttoMatic-Android";
      case Game.BUGDOM:
        return "Bugdom-android";
      case Game.BUGDOM_2:
        return "Bugdom2-Android";
      case Game.NANOSAUR:
        return "Nanosaur-android";
      case Game.NANOSAUR_2:
        return "Nanosaur2-Android";
      case Game.CRO_MAG:
        return "CroMagRally-Android";
      case Game.BILLY_FRONTIER:
        return "BillyFrontier-Android";
      case Game.MIGHTY_MIKE:
        return "MightyMike-Android";
      default:
        return globals.GAME_NAME;
    }
  })();

  const supportedHooks =
    globals.GAME_TYPE === Game.MIGHTY_MIKE
      ? getMightyMikeHooks()
      : globals.GAME_TYPE === Game.CRO_MAG
        ? getRaceHooks()
        : getAdventureHooks();

  return {
    gameId,
    gameLabel: globals.GAME_NAME,
    levelNumber,
    levelKey: levelNumber === null ? "current" : String(levelNumber),
    supportedHooks,
    allowedTags: getGameTags(gameId),
  };
}

export function getScriptWorkspaceId(context: ScriptWorkspaceContext): string {
  return buildWorkspaceId(context);
}

export const scriptWorkspaceStoreAtom = atom<Readonly<Record<string, ScriptWorkspaceState>>>({});

export function ensureScriptWorkspace(
  store: Readonly<Record<string, ScriptWorkspaceState>>,
  context: ScriptWorkspaceContext,
): ScriptWorkspaceState {
  return store[buildWorkspaceId(context)] ?? createEmptyWorkspace(context);
}

export function replaceScriptWorkspace(
  store: Readonly<Record<string, ScriptWorkspaceState>>,
  state: ScriptWorkspaceState,
): Readonly<Record<string, ScriptWorkspaceState>> {
  return {
    ...store,
    [buildWorkspaceId(state.context)]: refreshGeneratedEntry(state, state.context),
  };
}

export function retargetScriptWorkspace(
  state: ScriptWorkspaceState,
  context: ScriptWorkspaceContext,
): ScriptWorkspaceState {
  if (
    state.context.gameId === context.gameId &&
    state.context.levelKey === context.levelKey
  ) {
    return state;
  }

  const sourceLevel = state.levels[state.context.levelKey] ?? defaultLevelState();

  return {
    ...state,
    context,
    levels: state.levels[context.levelKey]
      ? state.levels
      : {
          ...state.levels,
          [context.levelKey]: sourceLevel,
        },
  };
}

function updateWorkspaceLevel(
  state: ScriptWorkspaceState,
  levelKey: string,
  updater: (levelState: ScriptLevelState) => ScriptLevelState,
): ScriptWorkspaceState {
  const currentLevel = state.levels[levelKey] ?? defaultLevelState();
  return {
    ...state,
    levels: {
      ...state.levels,
      [levelKey]: updater(currentLevel),
    },
  };
}

export function setScriptActiveFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  if (!state.sourceFiles[path] && !state.compiledFiles[path]) {
    return state;
  }

  return {
    ...state,
    activeFilePath: path,
  };
}

export function upsertScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
  content: string,
  role: ScriptSourceFile["role"] = "user",
  ownerId?: string,
): ScriptWorkspaceState {
  const nextFiles: Record<string, ScriptSourceFile> = { ...state.sourceFiles };
  const existing = nextFiles[path];
  nextFiles[path] = existing
    ? {
        ...existing,
        content,
        language: inferLanguage(path),
      }
    : createSourceFile(path, content, role, ownerId);

  const nextOrder = state.moduleOrder.includes(path)
    ? state.moduleOrder
    : [...state.moduleOrder, path];

  return refreshGeneratedEntry(
    {
      ...state,
      activeFilePath: path,
      sourceFiles: nextFiles,
      moduleOrder: nextOrder,
    },
    state.context,
  );
}

export function updateScriptSourceContent(
  state: ScriptWorkspaceState,
  path: string,
  content: string,
): ScriptWorkspaceState {
  const sourceFile = state.sourceFiles[path];
  if (!sourceFile || sourceFile.readOnly) {
    return state;
  }

  return {
    ...state,
    sourceFiles: {
      ...state.sourceFiles,
      [path]: {
        ...sourceFile,
        content,
      },
    },
  };
}

export function saveScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  const sourceFile = state.sourceFiles[path];
  if (!sourceFile || sourceFile.readOnly) {
    return state;
  }

  return {
    ...state,
    sourceFiles: {
      ...state.sourceFiles,
      [path]: {
        ...sourceFile,
        savedContent: sourceFile.content,
      },
    },
  };
}

export function revertScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  const sourceFile = state.sourceFiles[path];
  if (!sourceFile || sourceFile.readOnly) {
    return state;
  }

  return {
    ...state,
    sourceFiles: {
      ...state.sourceFiles,
      [path]: {
        ...sourceFile,
        content: sourceFile.savedContent,
      },
    },
  };
}

export function removeScriptSourceFile(
  state: ScriptWorkspaceState,
  path: string,
): ScriptWorkspaceState {
  if (path === GENERATED_ENTRY_PATH || path === USER_BOOTSTRAP_PATH) {
    return state;
  }
  if (!state.sourceFiles[path]) {
    return state;
  }

  const nextFiles: Record<string, ScriptSourceFile> = { ...state.sourceFiles };
  delete nextFiles[path];

  return refreshGeneratedEntry(
    {
      ...state,
      activeFilePath:
        state.activeFilePath === path ? USER_BOOTSTRAP_PATH : state.activeFilePath,
      sourceFiles: nextFiles,
      moduleOrder: state.moduleOrder.filter((candidate) => candidate !== path),
    },
    state.context,
  );
}

function materializeBehaviorTemplate(
  behavior: ScriptBehaviorDefinition,
  replacements: Readonly<Record<string, string>>,
): string {
  let output = behavior.template;
  for (const [token, value] of Object.entries(replacements)) {
    output = replaceToken(output, token, value);
  }
  return output;
}

function getBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
): ScriptBehaviorDefinition | undefined {
  return state.behaviorCatalog.find((candidate) => candidate.id === behaviorId);
}

export function applyGlobalBehavior(
  state: ScriptWorkspaceState,
  hookId: ScriptHookId,
  behaviorId: string,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("global")) {
    return state;
  }

  const assignmentId = buildAssignmentId("global", `${hookId}-${behavior.id}`);
  const sourcePath = behavior.sourceFilePath;
  const hookName =
    hookId === "onAreaStart" || hookId === "onRaceStart"
      ? hookId
      : hookId;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    "__HOOK__": hookName,
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      globalHooks: [
        ...levelState.globalHooks.filter((candidate) => candidate.hookId !== hookId),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label: behavior.label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          hookId,
        },
      ],
    })),
    state.context,
  );
}

export function removeGlobalBehavior(
  state: ScriptWorkspaceState,
  hookId: ScriptHookId,
): ScriptWorkspaceState {
  const levelState = state.levels[state.context.levelKey] ?? defaultLevelState();
  const existing = levelState.globalHooks.find((candidate) => candidate.hookId === hookId);
  const withoutHook = updateWorkspaceLevel(state, state.context.levelKey, (current) => ({
    ...current,
    globalHooks: current.globalHooks.filter((candidate) => candidate.hookId !== hookId),
  }));

  if (!existing) {
    return refreshGeneratedEntry(withoutHook, state.context);
  }

  return removeScriptSourceFile(withoutHook, existing.sourceFilePath);
}

export function applyTerrainBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  label: string,
  signature: ScriptTerrainBindingSignature,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("terrainItem")) {
    return state;
  }

  const assignmentId = buildAssignmentId(
    "terrain",
    `${behavior.id}-${signature.itemType}-${signature.position.x}-${signature.position.z}`,
  );
  const sourcePath = `Data/Scripts/src/bindings/${assignmentId}.ts`;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    "__HOOK__": "onTerrainItem",
    "__CONTEXT_TYPE__": "TerrainItemContext",
    "__PREDICATE__": buildTerrainPredicate(signature),
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      terrainBindings: [
        ...levelState.terrainBindings.filter(
          (candidate) =>
            !(
              candidate.signature.itemType === signature.itemType &&
              candidate.signature.position.x === signature.position.x &&
              candidate.signature.position.y === signature.position.y &&
              candidate.signature.position.z === signature.position.z
            ),
        ),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          kind: "terrainItem",
          signature,
        },
      ],
    })),
    state.context,
  );
}

export function applySplineBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  label: string,
  signature: ScriptSplineBindingSignature,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("splineItem")) {
    return state;
  }

  const assignmentId = buildAssignmentId(
    "spline",
    `${behavior.id}-${signature.itemType}-${signature.splineNum}-${signature.placement}`,
  );
  const sourcePath = `Data/Scripts/src/bindings/${assignmentId}.ts`;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    "__HOOK__": "onSplineItem",
    "__CONTEXT_TYPE__": "SplineItemContext",
    "__PREDICATE__": buildSplinePredicate(signature),
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      splineBindings: [
        ...levelState.splineBindings.filter(
          (candidate) =>
            !(
              candidate.signature.itemType === signature.itemType &&
              candidate.signature.splineNum === signature.splineNum &&
              candidate.signature.placement === signature.placement
            ),
        ),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          kind: "splineItem",
          signature,
        },
      ],
    })),
    state.context,
  );
}

export function applyMapItemBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  label: string,
  signature: ScriptMapItemSignature,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("mapItem")) {
    return state;
  }

  const assignmentId = buildAssignmentId(
    "map-item",
    `${behavior.id}-${signature.itemType}-${signature.position.x}-${signature.position.y}`,
  );
  const sourcePath = `Data/Scripts/src/bindings/${assignmentId}.ts`;
  const sourceContent = materializeBehaviorTemplate(behavior, {
    "__HOOK__": "onMapItem",
    "__CONTEXT_TYPE__": "MikeMapItemContext",
    "__PREDICATE__": buildMapPredicate(signature),
  });

  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    assignmentId,
  );

  return refreshGeneratedEntry(
    updateWorkspaceLevel(nextState, state.context.levelKey, (levelState) => ({
      ...levelState,
      mapItemBindings: [
        ...levelState.mapItemBindings.filter(
          (candidate) =>
            !(
              candidate.signature.itemType === signature.itemType &&
              candidate.signature.position.x === signature.position.x &&
              candidate.signature.position.y === signature.position.y
            ),
        ),
        {
          id: assignmentId,
          behaviorId: behavior.id,
          label,
          sourceFilePath: sourcePath,
          tags: [...behavior.defaultTags],
          paramRefs: [],
          compatibility: behavior.previewSupport,
          kind: "mapItem",
          signature,
        },
      ],
    })),
    state.context,
  );
}

export function removeBindingById(
  state: ScriptWorkspaceState,
  bindingId: string,
): ScriptWorkspaceState {
  const levelState = state.levels[state.context.levelKey] ?? defaultLevelState();
  const binding = [
    ...levelState.terrainBindings,
    ...levelState.splineBindings,
    ...levelState.mapItemBindings,
  ].find((candidate) => candidate.id === bindingId);

  const nextState = updateWorkspaceLevel(state, state.context.levelKey, (current) => ({
    ...current,
    terrainBindings: current.terrainBindings.filter((candidate) => candidate.id !== bindingId),
    splineBindings: current.splineBindings.filter((candidate) => candidate.id !== bindingId),
    mapItemBindings: current.mapItemBindings.filter((candidate) => candidate.id !== bindingId),
  }));

  if (!binding) {
    return refreshGeneratedEntry(nextState, state.context);
  }

  return removeScriptSourceFile(nextState, binding.sourceFilePath);
}

export function createCustomObjectFromBehavior(
  state: ScriptWorkspaceState,
  behaviorId: string,
  objectId: string,
  label: string,
): ScriptWorkspaceState {
  const behavior = getBehavior(state, behaviorId);
  if (!behavior || !behavior.targetKinds.includes("customObject")) {
    return state;
  }

  const exportName = slugify(objectId).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  const sourcePath = `Data/Scripts/src/objects/${slugify(objectId)}.ts`;
  const sourceContent = behavior.template;
  const existingObject = state.customObjects.find((candidate) => candidate.id === objectId);
  const nextState = upsertScriptSourceFile(
    state,
    sourcePath,
    sourceContent,
    "generated-assignment",
    objectId,
  );

  return refreshGeneratedEntry(
    {
      ...nextState,
      customObjects: existingObject
        ? nextState.customObjects.map((candidate) =>
            candidate.id === objectId
              ? {
                  ...candidate,
                  label,
                  sourceFilePath: sourcePath,
                  exportName,
                  tags: [...behavior.defaultTags],
                  compatibility: behavior.previewSupport,
                  description: behavior.description,
                }
              : candidate,
          )
        : [
            ...nextState.customObjects,
            {
              id: objectId,
              label,
              sourceFilePath: sourcePath,
              exportName,
              tags: [...behavior.defaultTags],
              compatibility: behavior.previewSupport,
              description: behavior.description,
            },
          ],
    },
    state.context,
  );
}

export function placeCustomObject(
  state: ScriptWorkspaceState,
  objectId: string,
  label: string,
  position: { readonly x: number; readonly y: number; readonly z: number },
): ScriptWorkspaceState {
  const placementId = buildAssignmentId(
    "placement",
    `${objectId}-${position.x}-${position.y}-${position.z}`,
  );
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    customPlacements: [
      ...levelState.customPlacements.filter((candidate) => candidate.id !== placementId),
      {
        id: placementId,
        objectId,
        label,
        position,
        levelKey: state.context.levelKey,
      },
    ],
  }));
}

export function removeCustomPlacement(
  state: ScriptWorkspaceState,
  placementId: string,
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    customPlacements: levelState.customPlacements.filter(
      (candidate) => candidate.id !== placementId,
    ),
  }));
}

export function moveCustomPlacement(
  state: ScriptWorkspaceState,
  placementId: string,
  position: { readonly x: number; readonly y: number; readonly z: number },
): ScriptWorkspaceState {
  return updateWorkspaceLevel(state, state.context.levelKey, (levelState) => ({
    ...levelState,
    customPlacements: levelState.customPlacements.map((placement) =>
      placement.id === placementId ? { ...placement, position } : placement,
    ),
  }));
}

export function compileScriptWorkspace(
  state: ScriptWorkspaceState,
): Result<ScriptWorkspaceState, string> {
  const refreshed = refreshGeneratedEntry(state, state.context);
  const diagnostics: ScriptDiagnostic[] = [];
  const compiledFiles: Record<string, ScriptCompiledFile> = {};
  const transpiledModules: Record<string, string> = {};

  for (const sourceFile of Object.values(refreshed.sourceFiles)) {
    const compileResult = compileModule(sourceFile);
    if (compileResult.isErr()) {
      return err(compileResult.error);
    }

    diagnostics.push(...compileResult.value.diagnostics);
    diagnostics.push(...buildRequireDiagnostics(sourceFile.path, compileResult.value.output));
    const compiledPath = getCompiledModulePath(sourceFile.path);
    compiledFiles[compiledPath] = {
      path: compiledPath,
      content: compileResult.value.output,
      sourcePath: sourceFile.path,
    };
    transpiledModules[toBundleModuleId(sourceFile.path)] = compileResult.value.output;
  }

  compiledFiles[BUNDLED_RUNTIME_PATH] = {
    path: BUNDLED_RUNTIME_PATH,
    content: buildBundle(transpiledModules, GENERATED_ENTRY_PATH),
    sourcePath: GENERATED_ENTRY_PATH,
  };

  const updatedState = {
    ...refreshed,
    compiledFiles,
    diagnostics,
  };

  return ok(
    addStatusLog(
      updatedState,
      diagnostics.some((diagnostic) => diagnostic.severity === "error")
        ? "Compile completed with errors"
        : "Compile completed successfully",
    ),
  );
}

function buildRuntimeLevelsJson(context: ScriptWorkspaceContext): z.infer<typeof runtimeLevelsSchema> {
  if (context.levelNumber === null) {
    return {
      version: 1,
      levels: {},
    };
  }

  return {
    version: 1,
    levels: {
      [String(context.levelNumber)]: {
        script: BUNDLED_RUNTIME_PATH,
        extraNativeItems: [],
        itemOverrides: [],
      },
    },
  };
}

function buildProjectJson(state: ScriptWorkspaceState): z.infer<typeof scriptProjectSchema> {
  return {
    schemaVersion: 1,
    gameId: state.context.gameId,
    entryCompiledPath: BUNDLED_RUNTIME_PATH,
    editor: {
      activeFilePath: state.activeFilePath,
      moduleOrder: state.moduleOrder.filter((path) => path !== GENERATED_ENTRY_PATH),
      behaviorCatalog: state.behaviorCatalog.map(cloneBehaviorDefinition),
      diagnostics: [...state.diagnostics],
      levels: cloneLevelMap(state.levels),
      sampleId: state.sampleId,
      statusLog: [...state.statusLog],
    },
  };
}

function buildBindingsJson(state: ScriptWorkspaceState, levelKey: string): z.infer<typeof scriptBindingsFileSchema> {
  const levelState = state.levels[levelKey] ?? defaultLevelState();
  return {
    schemaVersion: 1,
    terrainBindings: levelState.terrainBindings.map(cloneTerrainBinding),
    splineBindings: levelState.splineBindings.map(cloneSplineBinding),
    mapItemBindings: levelState.mapItemBindings.map(cloneMapItemBinding),
  };
}

function buildPlacementsJson(state: ScriptWorkspaceState, levelKey: string): z.infer<typeof scriptPlacementsFileSchema> {
  const levelState = state.levels[levelKey] ?? defaultLevelState();
  return {
    schemaVersion: 1,
    placements: levelState.customPlacements.map(cloneCustomPlacement),
  };
}

function buildObjectsJson(state: ScriptWorkspaceState): z.infer<typeof scriptObjectsFileSchema> {
  return {
    schemaVersion: 1,
    objects: state.customObjects.map(cloneCustomObjectDefinition),
  };
}

function buildParamsJson(state: ScriptWorkspaceState): z.infer<typeof scriptParamsFileSchema> {
  return {
    schemaVersion: 1,
    params: state.params.map(cloneParameterDefinition),
  };
}

export interface ScriptPackageFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

export function buildScriptPackageFiles(
  state: ScriptWorkspaceState,
): Result<readonly ScriptPackageFile[], string> {
  const compiledState = compileScriptWorkspace(state);
  if (compiledState.isErr()) {
    return err(compiledState.error);
  }

  const compiled = compiledState.value;
  const files: ScriptPackageFile[] = [
    {
      path: "Data/Scripts/config/project.json",
      bytes: encodeJson(buildProjectJson(compiled)),
    },
    {
      path: "Data/Scripts/config/levels.json",
      bytes: encodeJson(buildRuntimeLevelsJson(compiled.context)),
    },
    {
      path: `Data/Scripts/config/bindings/${levelLabelFromContext(compiled.context)}.json`,
      bytes: encodeJson(buildBindingsJson(compiled, compiled.context.levelKey)),
    },
    {
      path: `Data/Scripts/config/placements/${levelLabelFromContext(compiled.context)}.json`,
      bytes: encodeJson(buildPlacementsJson(compiled, compiled.context.levelKey)),
    },
    {
      path: "Data/Scripts/config/objects.json",
      bytes: encodeJson(buildObjectsJson(compiled)),
    },
    {
      path: "Data/Scripts/config/params.json",
      bytes: encodeJson(buildParamsJson(compiled)),
    },
  ];

  for (const sourceFile of Object.values(compiled.sourceFiles)) {
    if (sourceFile.path === GENERATED_ENTRY_PATH) {
      continue;
    }
    files.push({
      path: sourceFile.path,
      bytes: encodeText(sourceFile.content),
    });
  }

  for (const compiledFile of Object.values(compiled.compiledFiles)) {
    if (compiledFile.path !== BUNDLED_RUNTIME_PATH) {
      continue;
    }
    files.push({
      path: compiledFile.path,
      bytes: encodeText(compiledFile.content),
    });
  }

  for (const asset of Object.values(compiled.assets)) {
    files.push({
      path: asset.path,
      bytes: asset.bytes,
    });
  }

  return ok(files);
}

export function buildPreviewScriptFiles(
  state: ScriptWorkspaceState,
): Result<readonly PreviewVfsFile[], string> {
  const packageResult = buildScriptPackageFiles(state);
  if (packageResult.isErr()) {
    return err(packageResult.error);
  }

  return ok(
    packageResult.value.map((file) => ({
      path: `/${file.path}`,
      data: file.bytes,
    })),
  );
}

export function buildScriptPackageZip(
  state: ScriptWorkspaceState,
): Result<Uint8Array, string> {
  const packageResult = buildScriptPackageFiles(state);
  if (packageResult.isErr()) {
    return err(packageResult.error);
  }

  const zipInput: Record<string, Uint8Array> = Object.fromEntries(
    packageResult.value.map((file) => [file.path, file.bytes]),
  );

  return Result.fromThrowable(
    () => zipSync(zipInput, { level: 6 }),
    () => "Failed to build script package zip",
  )();
}

function decodeJsonFile<T>(
  files: Readonly<Record<string, Uint8Array>>,
  path: string,
  schema: z.ZodSchema<T>,
): Result<T | null, string> {
  const bytes = files[path];
  if (!bytes) {
    return ok(null);
  }

  const parseJson = Result.fromThrowable(
    () => JSON.parse(strFromU8(bytes)),
    () => `Failed to parse ${path}`,
  )();
  if (parseJson.isErr()) {
    return err(parseJson.error);
  }

  const parsed = schema.safeParse(parseJson.value);
  if (!parsed.success) {
    return err(`${path}: ${parsed.error.message}`);
  }

  return ok(parsed.data);
}

export function importScriptPackageZip(
  bytes: Uint8Array,
  context: ScriptWorkspaceContext,
): Result<ScriptWorkspaceState, string> {
  const unzipResult = Result.fromThrowable(
    () => unzipSync(bytes),
    () => "Failed to read uploaded script package",
  )();
  if (unzipResult.isErr()) {
    return err(unzipResult.error);
  }

  const files = unzipResult.value;
  const workspace = createEmptyWorkspace(context);
  const projectJsonResult = decodeJsonFile(files, "Data/Scripts/config/project.json", scriptProjectSchema);
  if (projectJsonResult.isErr()) {
    return err(projectJsonResult.error);
  }
  const runtimeLevelsResult = decodeJsonFile(files, "Data/Scripts/config/levels.json", runtimeLevelsSchema);
  if (runtimeLevelsResult.isErr()) {
    return err(runtimeLevelsResult.error);
  }

  const bindingsPath = `Data/Scripts/config/bindings/${levelLabelFromContext(context)}.json`;
  const placementsPath = `Data/Scripts/config/placements/${levelLabelFromContext(context)}.json`;
  const bindingsResult = decodeJsonFile(files, bindingsPath, scriptBindingsFileSchema);
  if (bindingsResult.isErr()) {
    return err(bindingsResult.error);
  }
  const placementsResult = decodeJsonFile(files, placementsPath, scriptPlacementsFileSchema);
  if (placementsResult.isErr()) {
    return err(placementsResult.error);
  }
  const objectsResult = decodeJsonFile(files, "Data/Scripts/config/objects.json", scriptObjectsFileSchema);
  if (objectsResult.isErr()) {
    return err(objectsResult.error);
  }
  const paramsResult = decodeJsonFile(files, "Data/Scripts/config/params.json", scriptParamsFileSchema);
  if (paramsResult.isErr()) {
    return err(paramsResult.error);
  }

  const projectJson = projectJsonResult.value;
  const importedFiles = Object.entries(files)
    .filter(([path]) => path.startsWith("Data/Scripts/src/") && path !== GENERATED_ENTRY_PATH)
    .map(([path, fileBytes]) =>
      createSourceFile(path, strFromU8(fileBytes), "user"),
    );

  const sourceFiles: Record<string, ScriptSourceFile> = Object.fromEntries(
    importedFiles.map((file) => [file.path, file]),
  );
  sourceFiles[USER_BOOTSTRAP_PATH] = sourceFiles[USER_BOOTSTRAP_PATH] ?? createSourceFile(
    USER_BOOTSTRAP_PATH,
    buildBaseRuntimeTemplate(),
    "user",
  );

  const nextState: ScriptWorkspaceState = refreshGeneratedEntry(
    {
      ...workspace,
      activeFilePath: projectJson?.editor.activeFilePath ?? USER_BOOTSTRAP_PATH,
      behaviorCatalog: projectJson?.editor.behaviorCatalog ?? workspace.behaviorCatalog,
      moduleOrder:
        projectJson?.editor.moduleOrder.length
          ? projectJson.editor.moduleOrder
          : Object.keys(sourceFiles).filter((path) => path !== GENERATED_ENTRY_PATH),
      sourceFiles,
      customObjects: objectsResult.value?.objects ?? [],
      params: paramsResult.value?.params ?? [],
      diagnostics: projectJson?.editor.diagnostics ?? [],
      statusLog: projectJson?.editor.statusLog ?? ["Imported script package"],
      sampleId: projectJson?.editor.sampleId ?? null,
      levels: {
        [context.levelKey]: {
          globalHooks: projectJson?.editor.levels[context.levelKey]?.globalHooks ?? [],
          terrainBindings: bindingsResult.value?.terrainBindings ?? [],
          splineBindings: bindingsResult.value?.splineBindings ?? [],
          mapItemBindings: bindingsResult.value?.mapItemBindings ?? [],
          customPlacements: placementsResult.value?.placements ?? [],
        },
      },
    },
    context,
  );

  const compileResult = compileScriptWorkspace(nextState);
  return compileResult.isOk() ? ok(compileResult.value) : err(compileResult.error);
}

function createSampleWorkspace(context: ScriptWorkspaceContext, sampleId: string): ScriptWorkspaceState {
  let state = createEmptyWorkspace(context);
  state = {
    ...state,
    sampleId,
  };

  if (sampleId === "otto-humans-jump" && context.gameId === "OttoMatic-Android") {
    state = applyGlobalBehavior(state, "onObjectFrame", "otto.humans-jump");
    return addStatusLog(state, "Loaded Otto humans jump sample");
  }

  if (sampleId === "log-level-start") {
    const preferredHook = context.supportedHooks.includes("onLevelStart")
      ? "onLevelStart"
      : context.supportedHooks.includes("onAreaStart")
        ? "onAreaStart"
        : "onRaceStart";
    state = applyGlobalBehavior(state, preferredHook, "sample.log-level-start");
    return addStatusLog(state, "Loaded log level start sample");
  }

  if (sampleId === "hover-beacon") {
    state = createCustomObjectFromBehavior(
      state,
      "sample.hover-beacon",
      "sample.hoverBeacon",
      "Hover Beacon",
    );
    state = placeCustomObject(state, "sample.hoverBeacon", "Hover Beacon", {
      x: 0,
      y: 160,
      z: 0,
    });
    return addStatusLog(state, "Loaded hover beacon sample");
  }

  return addStatusLog(state, "Loaded empty script sample");
}

export function getScriptSamples(context: ScriptWorkspaceContext): readonly ScriptSampleDefinition[] {
  const shared: readonly ScriptSampleDefinition[] = [
    {
      id: "log-level-start",
      label: "Log Level Start",
      description: "Minimal startup hook that confirms the script bundle is live.",
      createState: (sampleContext) => createSampleWorkspace(sampleContext, "log-level-start"),
    },
    {
      id: "hover-beacon",
      label: "Hover Beacon",
      description: "Sample scripted object definition plus placement for extended packages.",
      createState: (sampleContext) => createSampleWorkspace(sampleContext, "hover-beacon"),
    },
  ];

  if (context.gameId === "OttoMatic-Android") {
    return [
      {
        id: "otto-humans-jump",
        label: "Otto Humans Jump",
        description: "Bobs Otto human rescue targets in place using object-frame tags.",
        createState: (sampleContext) => createSampleWorkspace(sampleContext, "otto-humans-jump"),
      },
      ...shared,
    ];
  }

  return shared;
}

export function loadScriptSample(
  context: ScriptWorkspaceContext,
  sampleId: string,
): ScriptWorkspaceState {
  const sample = getScriptSamples(context).find((candidate) => candidate.id === sampleId);
  return sample ? sample.createState(context) : createEmptyWorkspace(context);
}

export function addScriptAsset(
  state: ScriptWorkspaceState,
  path: string,
  bytes: Uint8Array,
  sourceName: string,
): ScriptWorkspaceState {
  return {
    ...state,
    assets: {
      ...state.assets,
      [path]: {
        path,
        bytes,
        sourceName,
      },
    },
  };
}

export function addScriptParam(
  state: ScriptWorkspaceState,
  param: ScriptParameterDefinition,
): ScriptWorkspaceState {
  const existing = state.params.find((candidate) => candidate.id === param.id);
  return {
    ...state,
    params: existing
      ? state.params.map((candidate) => (candidate.id === param.id ? param : candidate))
      : [...state.params, param],
  };
}

export function addBehaviorDefinition(
  state: ScriptWorkspaceState,
  definition: {
    target: string;
    hooks: ScriptHookId[];
    id: string;
    label: string;
    description: string;
    tags: string[];
    sourceFilePath: string;
    sourceTemplate: string;
  },
): ScriptWorkspaceState {
  const targetKinds: ScriptTargetKind[] = (() => {
    switch (definition.target) {
      case "global":
        return ["global"];
      case "terrainItem":
        return ["terrainItem"];
      case "splineItem":
        return ["splineItem"];
      case "mightyMikeItem":
        return ["mapItem"];
      case "customObject":
        return ["customObject"];
      default:
        return ["terrainItem"];
    }
  })();

  const sourceFilePath = definition.sourceFilePath;

  const behaviorDef: ScriptBehaviorDefinition = {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    category: "user",
    targetKinds,
    supportedHooks: definition.hooks,
    sourceFilePath,
    previewSupport: "preview-ready",
    defaultTags: definition.tags,
    contributedTags: [],
    template: definition.sourceTemplate,
  };

  const sourceFile = createSourceFile(
    sourceFilePath,
    definition.sourceTemplate,
    "user",
    definition.id,
  );

  return refreshGeneratedEntry(
    {
      ...state,
      behaviorCatalog: [...state.behaviorCatalog, behaviorDef],
      sourceFiles: {
        ...state.sourceFiles,
        [sourceFilePath]: sourceFile,
      },
      activeFilePath: sourceFilePath,
      moduleOrder: state.moduleOrder.includes(sourceFilePath)
        ? state.moduleOrder
        : [...state.moduleOrder, sourceFilePath],
    },
    state.context,
  );
}
