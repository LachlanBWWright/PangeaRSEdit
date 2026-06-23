import { z } from "zod";

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
  "objectType",
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
  readonly objectType?: string;
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
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
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

export const scriptProjectSchema = z.object({
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
