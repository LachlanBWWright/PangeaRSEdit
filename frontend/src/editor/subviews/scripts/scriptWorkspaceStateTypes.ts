import { z } from "zod";

export const scriptHookIdSchema = z.enum([
  "onGameStart",
  "onGameShutdown",
  "onLevelLoad",
  "onLevelStart",
  "onFrame",
  "onObjectFrame",
  "onLevelComplete",
  "onLevelUnload",
  "onSave",
  "onLoad",
  "onTerrainItem",
  "onSplineItem",
  "onPickupCollected",
  "onWeaponHit",
  "onTriggerEnter",
  "onDamage",
  "onDamageApplied",
  "onDeath",
  "onPlayerSpawn",
  "onPlayerRespawn",
  "onCheckpointReached",
  "onLapComplete",
  "onRaceFinish",
  "onObjectiveComplete",
  "onAreaLoad",
  "onAreaStart",
  "onAreaFrame",
  "onAreaComplete",
  "onAreaUnload",
  "onMapItem",
  "onRaceLoad",
  "onRaceStart",
  "onRaceFrame",
  "onRaceComplete",
  "onRaceUnload",
]);

export type ScriptHookId = z.infer<typeof scriptHookIdSchema>;

const scriptTargetKindSchema = z.enum([
  "global",
  "terrainItem",
  "splineItem",
  "mapItem",
  "objectType",
  "customObject",
]);

export type ScriptTargetKind = z.infer<typeof scriptTargetKindSchema>;

const scriptSeveritySchema = z.enum(["error", "warning"]);

export const scriptDiagnosticCategorySchema = z.enum([
  "source-validation",
  "luals",
  "packaging",
  "runtime-traceback",
  "native-adapter",
]);

export type ScriptDiagnosticCategory = z.infer<
  typeof scriptDiagnosticCategorySchema
>;

export interface ScriptTagDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly targetKinds: readonly ScriptTargetKind[];
  readonly source: "game" | "behavior";
}

export const scriptTagDefinitionSchema = z.object({
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
  readonly objectType?: string;
  readonly previewSupport: "preview-ready" | "extended-only";
  readonly defaultTags: readonly string[];
  readonly contributedTags: readonly ScriptTagDefinition[];
  readonly template: string;
}

export const scriptBehaviorDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  targetKinds: z.array(scriptTargetKindSchema).min(1),
  supportedHooks: z.array(scriptHookIdSchema),
  sourceFilePath: z.string().min(1),
  objectType: z.string().min(1).optional(),
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
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
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

export const scriptGlobalAssignmentSchema = z.object({
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

export const scriptTerrainBindingSchema = z.object({
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

export const scriptSplineBindingSchema = z.object({
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

export const scriptMapItemBindingSchema = z.object({
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

export const scriptParameterDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["number", "boolean", "string"]),
  description: z.string().min(1),
  defaultValue: z.string(),
});

const scriptCustomObjectVisualSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("nativeDisplayGroup"),
    group: z.enum(["global", "levelSpecific"]),
    modelObject: z.number().int().nonnegative(),
    scale: z.number().positive().max(100),
    slot: z.number().int().min(0).max(32767),
  }),
  z.object({
    kind: z.literal("customDisplayGroup"),
    modelPath: z
      .string()
      .regex(/^Data\/Scripts\/assets\/models\/[a-zA-Z0-9._/-]+\.(bg3d|3dmf|shapes)$/),
    modelObject: z.number().int().nonnegative(),
    scale: z.number().positive().max(100),
    slot: z.number().int().min(0).max(32767),
  }),
  z.object({
    kind: z.literal("nativeSkeleton"),
    skeletonType: z.number().int().nonnegative(),
    initialAnimation: z.number().int().nonnegative(),
    animationSpeed: z.number().positive().max(100),
    scale: z.number().positive().max(100),
    slot: z.number().int().min(0).max(32767),
  }),
  z.object({
    kind: z.literal("customSkeleton"),
    modelPath: z
      .string()
      .regex(/^Data\/Scripts\/assets\/skeletons\/[a-zA-Z0-9._/-]+\.(bg3d|3dmf)$/),
    skeletonPath: z
      .string()
      .regex(
        /^Data\/Scripts\/assets\/skeletons\/[a-zA-Z0-9._/-]+\.skeleton$/,
      ),
    animations: z.record(z.string().min(1), z.number().int().nonnegative()),
    initialAnimation: z.string().min(1),
    animationSpeed: z.number().positive().max(100),
    scale: z.number().positive().max(100),
    slot: z.number().int().min(0).max(32767),
  }),
]);

const scriptCustomObjectCollisionBoundsSchema = z.object({
  width: z.number().positive().max(1000),
  height: z.number().positive().max(1000),
  depth: z.number().positive().max(1000),
});

const scriptCustomObjectCollisionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("preset"),
    preset: z.enum(["solidBox", "triggerBox", "pickup", "enemy", "platform"]),
    bounds: scriptCustomObjectCollisionBoundsSchema.optional(),
  }),
]);

export const scriptCustomObjectDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  sourceFilePath: z.string().min(1),
  exportName: z.string().min(1),
  tags: z.array(z.string()),
  compatibility: z.enum(["preview-ready", "extended-only"]),
  description: z.string().min(1),
  visual: scriptCustomObjectVisualSchema.default({ kind: "none" }),
  collision: scriptCustomObjectCollisionSchema.default({ kind: "none" }),
});

export type ScriptCustomObjectDefinition = z.infer<
  typeof scriptCustomObjectDefinitionSchema
>;

export interface ScriptCustomObjectPlacement {
  readonly id: string;
  readonly objectId: string;
  readonly label: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly levelKey: string;
}

export const scriptCustomObjectPlacementSchema = z.object({
  id: z.string().min(1),
  objectId: z.string().min(1),
  label: z.string().min(1),
  position: vector3Schema,
  levelKey: z.string().min(1),
});

export const scriptTerrainReplacementSchema = z.object({
  id: z.string().min(1),
  itemIndex: z.number().int().nonnegative(),
  nativeType: z.number().int().nonnegative(),
  x: z.number().finite(),
  z: z.number().finite(),
  customObjectId: z.string().min(1),
  strict: z.boolean().default(false),
});

export type ScriptTerrainReplacement = z.infer<
  typeof scriptTerrainReplacementSchema
>;

export const scriptMapReplacementSchema = z.object({
  id: z.string().min(1),
  itemIndex: z.number().int().nonnegative(),
  nativeType: z.number().int().nonnegative(),
  x: z.number().finite(),
  y: z.number().finite(),
  customObjectId: z.string().min(1),
  strict: z.boolean().default(false),
});

export type ScriptMapReplacement = z.infer<typeof scriptMapReplacementSchema>;

export const scriptSplineReplacementSchema = z.object({
  id: z.string().min(1),
  splineNum: z.number().int().nonnegative(),
  itemIndex: z.number().int().nonnegative(),
  nativeType: z.number().int().nonnegative(),
  placement: z.number().finite().min(0).max(1),
  customObjectId: z.string().min(1),
  strict: z.boolean().default(false),
});

export type ScriptSplineReplacement = z.infer<
  typeof scriptSplineReplacementSchema
>;

export interface ScriptSourceFile {
  readonly path: string;
  readonly content: string;
  readonly savedContent: string;
  readonly language: "lua";
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
  readonly category: ScriptDiagnosticCategory;
  readonly severity: z.infer<typeof scriptSeveritySchema>;
  readonly message: string;
  readonly code: number | string;
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
}

const scriptDiagnosticSchema = z.object({
  category: scriptDiagnosticCategorySchema.default("source-validation"),
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
  readonly terrainReplacements: readonly ScriptTerrainReplacement[];
  readonly mapReplacements: readonly ScriptMapReplacement[];
  readonly splineReplacements: readonly ScriptSplineReplacement[];
}

export const scriptLevelStateSchema = z.object({
  globalHooks: z.array(scriptGlobalAssignmentSchema),
  terrainBindings: z.array(scriptTerrainBindingSchema),
  splineBindings: z.array(scriptSplineBindingSchema),
  mapItemBindings: z.array(scriptMapItemBindingSchema),
  customPlacements: z.array(scriptCustomObjectPlacementSchema),
  terrainReplacements: z.array(scriptTerrainReplacementSchema).default([]),
  mapReplacements: z.array(scriptMapReplacementSchema).default([]),
  splineReplacements: z.array(scriptSplineReplacementSchema).default([]),
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

export const scriptProjectSchema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal(1).default(1),
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

export const scriptBindingsFileSchema = z.object({
  schemaVersion: z.literal(1),
  terrainBindings: z.array(scriptTerrainBindingSchema),
  splineBindings: z.array(scriptSplineBindingSchema),
  mapItemBindings: z.array(scriptMapItemBindingSchema),
});

export const scriptPlacementsFileSchema = z.object({
  schemaVersion: z.literal(1),
  placements: z.array(scriptCustomObjectPlacementSchema),
});

export const scriptObjectsFileSchema = z.object({
  schemaVersion: z.literal(1),
  objects: z.array(scriptCustomObjectDefinitionSchema),
});

export const scriptParamsFileSchema = z.object({
  schemaVersion: z.literal(1),
  params: z.array(scriptParameterDefinitionSchema),
});

export const runtimeLevelConfigSchema = z.object({
  script: z.string().min(1),
  extraNativeItems: z.array(z.string()).default([]),
  itemOverrides: z
    .array(
      z.object({
        from: z.number().int(),
        to: z.number().int(),
      }),
    )
    .default([]),
  customObjects: z.array(scriptCustomObjectDefinitionSchema).default([]),
  terrainReplacements: z.array(scriptTerrainReplacementSchema).default([]),
  mapReplacements: z.array(scriptMapReplacementSchema).default([]),
  splineReplacements: z.array(scriptSplineReplacementSchema).default([]),
  levelSettings: z
    .object({
      assetDependencies: z
        .array(
          z.object({
            kind: z.string().min(1),
            id: z.string().min(1),
          }),
        )
        .optional(),
    })
    .catchall(
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(
          z.object({
            kind: z.string().min(1),
            id: z.string().min(1),
          }),
        ),
      ]),
    )
    .optional(),
});

export const runtimeLevelsSchema = z.object({
  version: z.literal(1),
  levels: z.record(z.string(), runtimeLevelConfigSchema),
});

export const GENERATED_ENTRY_PATH = "Data/Scripts/src/main.lua";
export const USER_BOOTSTRAP_PATH = "Data/Scripts/src/user.lua";
export const BUNDLED_RUNTIME_PATH = "Data/Scripts/dist/main.lua";
