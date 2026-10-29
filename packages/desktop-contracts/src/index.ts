import { z } from "zod";
import { assetPipelineRequests } from "./assetPipeline.ts";
import { spritePipelineRequests } from "./spritePipeline.ts";
import { portableAssetRequests } from "./assetPortable.ts";
import { scriptStateQuerySchema } from "./scriptState.ts";
export * from "./scriptState.ts";
export * from "./assetPipeline.ts";
export * from "./spritePipeline.ts";
export * from "./assetPortable.ts";
export { editorPreferencesSchema, gameRunSchema, editorUpdateSchema } from "./desktopFeatures.ts";
export { scriptInspectorSchema, scriptInspectorObjectSchema, scriptInspectorPageSchema, scriptDiagnosticsSchema, scriptObjectResourcesSchema, type ScriptObjectResources, type ScriptInspectorSnapshot, type ScriptInspectorPage, type ScriptDiagnostics } from "./scriptInspector.ts";
export type { EditorPreferences, GameRun } from "./desktopFeatures.ts";
export { mergeText } from "./mergeText.ts";

export const gameIdSchema = z.enum([
  "OttoMatic", "Bugdom", "Bugdom2", "Nanosaur", "Nanosaur2",
  "CroMagRally", "BillyFrontier", "MightyMike",
]);
export type GameId = z.infer<typeof gameIdSchema>;
export const relativePathSchema = z.string().min(1).max(240).refine(
  (path) => !/[\\:<>"|?*\x00-\x1f]/.test(path)
    && path.split("/").every((part) => part.length > 0 && part !== "." && part !== ".."
      && !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part))
    && !path.split("/").some((part) => part.startsWith(".") && part !== ".pangea" && part !== ".luarc.json"),
  "Expected a safe project-relative path",
);
export const fileSchema = z.object({
  path: relativePathSchema,
  bytes: z.instanceof(Uint8Array).refine((bytes) => bytes.byteLength <= 128 * 1024 * 1024),
});
export type ProjectFile = z.infer<typeof fileSchema>;
export const projectLevelSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  name: z.string().min(1).max(120),
  baseLevel: z.number().int().nonnegative().max(999),
  primary: relativePathSchema,
  texture: relativePathSchema.optional(),
  files: z.array(relativePathSchema).max(32),
});
export type ProjectLevel = z.infer<typeof projectLevelSchema>;
export const projectAssetBindingSchema = z.object({
  source: relativePathSchema,
  mode: z.enum(["file", "palette"]).optional(),
  target: relativePathSchema.refine((value) => value.startsWith("Data/") && !value.startsWith("Data/Scripts/"), "Choose a native game asset outside generated scripts"),
  levels: z.array(projectLevelSchema.shape.id).max(512),
});
export type ProjectAssetBinding = z.infer<typeof projectAssetBindingSchema>;
export const projectManifestSchema = z.object({
  kind: z.literal("pangea-editor-project"),
  version: z.literal(1),
  name: z.string().min(1).max(120),
  game: gameIdSchema,
  levels: z.array(projectLevelSchema).max(512),
  assetBindings: z.array(projectAssetBindingSchema).max(512).optional(),
}).refine((project) => new Set(project.levels.map((level) => level.id)).size === project.levels.length,
  "Duplicate level IDs");
export type ProjectManifest = z.infer<typeof projectManifestSchema>;
export const projectSnapshotSchema = z.object({
  folder: z.string(),
  manifest: projectManifestSchema,
  revision: z.string(),
  files: z.array(z.object({ path: relativePathSchema, hash: z.string(), size: z.number() })),
  recoveryAvailable: z.boolean(),
});
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;
export const failureSchema = z.object({
  ok: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});
export type HostError = z.infer<typeof failureSchema>["error"];
export function replySchema<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion("ok", [z.object({ ok: z.literal(true), value }), failureSchema]);
}
export const releaseAssetSchema = z.object({
  kind: z.enum(["runtime", "editor-assets"]).default("runtime"),
  game: gameIdSchema,
  platform: z.enum(["linux", "win32", "darwin", "web"]),
  arch: z.enum(["x64", "arm64", "universal", "wasm"]),
  filename: z.string().regex(/^[a-zA-Z0-9_.-]+$/),
  size: z.number().int().positive().max(2 * 1024 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  format: z.enum(["appimage", "zip"]),
});
export type ReleaseAsset = z.infer<typeof releaseAssetSchema>;
export const releaseManifestSchema = z.object({
  version: z.literal(1),
  tag: z.string().regex(/^[a-zA-Z0-9_.-]+$/),
  sourceRevision: z.string(),
  assetRootVersion: z.literal(2),
  scriptContractVersion: z.literal(2),
  assets: z.array(releaseAssetSchema),
});
export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;
export const installationSchema = z.object({
  game: gameIdSchema, version: z.string(), executable: z.string(), data: z.string(), managed: z.boolean(),
  assetRootVersion: z.literal(2),
});
export type Installation = z.infer<typeof installationSchema>;
export const upstreamDataReleaseSchema = z.object({
  game: gameIdSchema, version: z.string(), repository: z.string().regex(/^Jorio\/[A-Za-z0-9]+$/),
  tag: z.string().regex(/^[a-zA-Z0-9_.-]+$/), filename: z.string().regex(/^[a-zA-Z0-9_.-]+\.zip$/),
  size: z.number().int().positive().max(2 * 1024 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), dataPrefix: relativePathSchema,
  releaseUrl: z.string().url(), downloadUrl: z.string().url(),
});
export type UpstreamDataRelease = z.infer<typeof upstreamDataReleaseSchema>;
export const assetInstallationSchema = z.object({ game: gameIdSchema, version: z.string(), root: z.string(),
  source: z.enum(["editor", "upstream"]).default("editor"), dataRoot: z.string().optional(), releaseUrl: z.string().url().optional() });
export const hostInfoSchema = z.object({ platform: z.string(), arch: z.string() });
export const hostCommandSchema = z.enum(["save", "open", "new"]);
export const transferSchema = z.object({ game: gameIdSchema, received: z.number(), total: z.number() });
export const packLevelInputSchema = z.object({ id: projectLevelSchema.shape.id, name: z.string().min(1).max(120),
  args: z.array(z.string()).max(12), files: z.array(fileSchema).max(4096) });
export type PackLevelInput = z.infer<typeof packLevelInputSchema>;
export const packManifestSchema = z.object({ kind: z.literal("pangea-level-pack"), version: z.literal(1),
  editableProject: z.boolean().optional(),
  assetRootVersion: z.literal(2), scriptContractVersion: z.literal(2), name: z.string().min(1).max(120), game: gameIdSchema,
  levels: z.array(z.object({ id: projectLevelSchema.shape.id, name: z.string().min(1).max(120), args: z.array(z.string()).max(12), root: relativePathSchema })).min(1).max(512),
  files: z.array(z.object({ path: relativePathSchema, sha256: z.string().regex(/^[a-f0-9]{64}$/), size: z.number().int().nonnegative().max(128 * 1024 * 1024) })).max(32768),
});
export type PackManifest = z.infer<typeof packManifestSchema>;
export const installedPackSchema = z.object({ id: z.string().regex(/^[a-f0-9]{64}$/), manifest: packManifestSchema });
export type InstalledPack = z.infer<typeof installedPackSchema>;
export const preparedEditsSchema = z.object({ manifest: projectManifestSchema, files: z.array(fileSchema).max(4096), removed: z.array(relativePathSchema).max(4096) });
export type PreparedEdits = z.infer<typeof preparedEditsSchema>;
export const conflictFileSchema = z.object({ path: relativePathSchema, binary: z.boolean(), base: z.string().nullable(), editor: z.string().nullable(), disk: z.string().nullable(),
  merged: z.string().nullable(), decision: z.enum(["editor", "disk", "merged", "unresolved"]), reason: z.string(), baseAvailable: z.boolean(),
  editorSize: z.number().nullable(), diskSize: z.number().nullable(), editorAvailable: z.boolean() });
export type ConflictFile = z.infer<typeof conflictFileSchema>;
export const conflictReviewSchema = z.object({ id: z.string().uuid(), revision: z.string(), files: z.array(conflictFileSchema) });
export type ConflictReview = z.infer<typeof conflictReviewSchema>;
export const conflictChoiceSchema = z.object({ path: relativePathSchema, choice: z.enum(["editor", "disk", "merged"]), text: z.string().max(262144).optional() });
export const hostRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("project.open") }),
  ...assetPipelineRequests,
  ...spritePipelineRequests,
  ...portableAssetRequests,
  z.object({ operation: z.literal("project.recent") }),
  z.object({ operation: z.literal("project.restore") }),
  z.object({ operation: z.literal("project.session"), levelId: projectLevelSchema.shape.id.nullable() }),
  z.object({ operation: z.literal("project.reopen"), folder: z.string().min(1).max(4096) }),
  z.object({ operation: z.literal("project.copy"), revision: z.string() }),
  z.object({ operation: z.literal("project.external"), path: relativePathSchema.optional(), action: z.enum(["open", "reveal", "vscode", "edit"]), line: z.number().int().min(1).max(1000000).optional() }),
  z.object({ operation: z.literal("editor.preferences") }),
  z.object({ operation: z.literal("editor.configure"), editor: z.enum(["system", "vscode", "vscodium", "custom"]) }),
  z.object({ operation: z.literal("editor.updates") }),
  z.object({ operation: z.literal("editor.release") }),
  z.object({ operation: z.literal("games.runs") }),
  scriptStateQuerySchema.extend({ operation: z.literal("games.script-state"), id: z.string().uuid() }),
  z.object({ operation: z.literal("games.script-objects"), id: z.string().uuid(), offset: z.number().int().nonnegative(), scriptedOnly: z.boolean(), handle: z.object({ id: z.number().int().positive().max(2147483647), generation: z.number().int().nonnegative().max(4294967295) }).optional() }),
  z.object({ operation: z.literal("games.asset-files"), game: gameIdSchema }),
  z.object({ operation: z.literal("games.asset-read"), game: gameIdSchema, path: relativePathSchema }),
  z.object({ operation: z.literal("games.stop"), id: z.string().uuid() }),
  z.object({ operation: z.literal("games.restart"), id: z.string().uuid() }),
  z.object({ operation: z.literal("packs.export"), revision: z.string(), levels: z.array(packLevelInputSchema).min(1).max(512), includeEditableProject: z.boolean().optional(), includeAuthoringSources: z.boolean().optional() }),
  z.object({ operation: z.literal("packs.open") }),
  z.object({ operation: z.literal("packs.list") }),
  z.object({ operation: z.literal("packs.play"), id: z.string().regex(/^[a-f0-9]{64}$/), levelId: projectLevelSchema.shape.id }),
  z.object({ operation: z.literal("packs.import"), id: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ operation: z.literal("packs.remove"), id: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ operation: z.literal("project.review"), base: projectSnapshotSchema, edits: preparedEditsSchema }),
  z.object({ operation: z.literal("project.apply-review"), id: z.string().uuid(), choices: z.array(conflictChoiceSchema).max(8192) }),
  z.object({ operation: z.literal("project.create"), name: z.string().min(1).max(120), game: gameIdSchema }),
  z.object({ operation: z.literal("project.inspect") }),
  z.object({ operation: z.literal("project.read"), paths: z.array(relativePathSchema).max(4096) }),
  z.object({ operation: z.literal("project.save"), revision: z.string(), manifest: projectManifestSchema,
    files: z.array(fileSchema).max(4096), removed: z.array(relativePathSchema).max(4096).default([]) }),
  z.object({ operation: z.literal("project.recover"), action: z.enum(["read", "discard"]) }),
  z.object({ operation: z.literal("project.backup"), manifest: projectManifestSchema, files: z.array(fileSchema).max(4096) }),
  z.object({ operation: z.literal("games.catalog"), prerelease: z.boolean().default(false) }),
  z.object({ operation: z.literal("games.upstream-catalog") }),
  z.object({ operation: z.literal("games.install-upstream-data"), game: gameIdSchema }),
  z.object({ operation: z.literal("games.installed") }),
  z.object({ operation: z.literal("games.install"), game: gameIdSchema, tag: z.string(), kind: z.literal("runtime").default("runtime") }),
  z.object({ operation: z.literal("games.assets") }),
  z.object({ operation: z.literal("games.remove-assets"), game: gameIdSchema }),
  z.object({ operation: z.literal("games.cancel"), game: gameIdSchema }),
  z.object({ operation: z.literal("games.locate"), game: gameIdSchema }),
  z.object({ operation: z.literal("games.remove"), game: gameIdSchema }),
  z.object({ operation: z.literal("games.play"), game: gameIdSchema }),
  z.object({ operation: z.literal("games.test"), game: gameIdSchema, args: z.array(z.string()).max(12),
    files: z.array(fileSchema).max(4096) }),
  z.object({ operation: z.literal("host.dirty"), dirty: z.boolean() }),
  z.object({ operation: z.literal("host.info") }),
]);
export type HostRequest = z.infer<typeof hostRequestSchema>;
export interface DesktopBridge {
  platform?: string;
  security?: { sandboxed: boolean; contextIsolated: boolean };
  request: (request: HostRequest) => Promise<unknown>;
  onProjectChange: (listener: (value: unknown) => void) => () => void;
  onTransfer: (listener: (value: unknown) => void) => () => void;
  onCommand?: (listener: (value: unknown) => void) => () => void;
  onGameRun?: (listener: (value: unknown) => void) => () => void;
  onAssetProgress?: (listener: (value: unknown) => void) => () => void;
}
export const PROJECT_MANIFEST = "pangea.project.json";
export const RELEASE_REPOSITORY = "lachlanbwwright/PangeaRSEdit";
export { GAME_ASSET_CATALOG, nativeAssetCandidates } from "./gameAssets.ts";
