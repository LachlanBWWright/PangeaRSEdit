import { z } from "zod";

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
export const projectManifestSchema = z.object({
  kind: z.literal("pangea-editor-project"),
  version: z.literal(1),
  name: z.string().min(1).max(120),
  game: gameIdSchema,
  levels: z.array(projectLevelSchema).max(512),
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
  assetRootVersion: z.literal(1),
  scriptContractVersion: z.literal(1),
  assets: z.array(releaseAssetSchema),
});
export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;
export const installationSchema = z.object({
  game: gameIdSchema, version: z.string(), executable: z.string(), data: z.string(), managed: z.boolean(),
  assetRootVersion: z.literal(1),
});
export type Installation = z.infer<typeof installationSchema>;
export const assetInstallationSchema = z.object({ game: gameIdSchema, version: z.string(), root: z.string() });
export const hostInfoSchema = z.object({ platform: z.string(), arch: z.string() });
export const hostCommandSchema = z.enum(["save", "open", "new"]);
export const transferSchema = z.object({ game: gameIdSchema, received: z.number(), total: z.number() });
export const hostRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("project.open") }),
  z.object({ operation: z.literal("project.create"), name: z.string().min(1).max(120), game: gameIdSchema }),
  z.object({ operation: z.literal("project.inspect") }),
  z.object({ operation: z.literal("project.read"), paths: z.array(relativePathSchema).max(4096) }),
  z.object({ operation: z.literal("project.save"), revision: z.string(), manifest: projectManifestSchema,
    files: z.array(fileSchema).max(4096), removed: z.array(relativePathSchema).max(4096).default([]) }),
  z.object({ operation: z.literal("project.recover"), action: z.enum(["read", "discard"]) }),
  z.object({ operation: z.literal("project.backup"), manifest: projectManifestSchema, files: z.array(fileSchema).max(4096) }),
  z.object({ operation: z.literal("games.catalog"), prerelease: z.boolean().default(false) }),
  z.object({ operation: z.literal("games.installed") }),
  z.object({ operation: z.literal("games.install"), game: gameIdSchema, tag: z.string(), kind: z.enum(["runtime", "editor-assets"]).default("runtime") }),
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
}
export const PROJECT_MANIFEST = "pangea.project.json";
export const RELEASE_REPOSITORY = "lachlanbwwright/PangeaRSEdit";
