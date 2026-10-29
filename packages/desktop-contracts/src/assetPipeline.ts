import { z } from "zod";

const assetOutputPathSchema = z.string().max(240).regex(/^Assets\/Models\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[A-Za-z0-9_.-]+$/);

export const assetIdSchema = z.string().uuid();
export const assetSourceSchema = z.object({
  mode: z.enum(["managed", "external"]), path: z.string().min(1), originalName: z.string(),
  format: z.enum(["blend", "gltf", "glb", "bg3d", "3dmf"]),
  dependencies: z.array(z.string()).max(4096), fingerprint: z.string(),
});
export const assetAnimationSchema = z.object({ index: z.number().int().nonnegative(), name: z.string(),
  events: z.array(z.object({ time: z.number().int().min(0).max(32767), type: z.number().int().min(0).max(8), value: z.number().int().min(0).max(255) })).optional() });
export const assetImportRecipeSchema = z.object({
  scale: z.number().positive().max(10000).default(1),
  rotation: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).default([0, 0, 0]),
  blenderCollection: z.string().max(120).optional(),
  materialMappings: z.array(z.object({ material: z.string().min(1).max(120), alwaysBlend: z.boolean().optional(),
    clampU: z.boolean().optional(), clampV: z.boolean().optional(),
    diffuseColor: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  })).max(256).optional(),
  animationEvents: z.array(z.object({ clip: z.string().min(1).max(120), events: z.array(z.object({
    time: z.number().int().min(0).max(32767), type: z.number().int().min(0).max(8), value: z.number().int().min(0).max(255),
  })).max(30) })).max(40).optional(),
});
export type AssetImportRecipe = z.infer<typeof assetImportRecipeSchema>;
export const assetOutputsSchema = z.object({
  model: assetOutputPathSchema, skeleton: assetOutputPathSchema.nullable(), preview: assetOutputPathSchema,
  files: z.array(assetOutputPathSchema).max(4096),
});
export const projectAssetSchema = z.object({
  version: z.literal(1), id: assetIdSchema, name: z.string().min(1).max(120), game: z.string(),
  revision: z.string().uuid(), source: assetSourceSchema, outputs: assetOutputsSchema,
  animations: z.array(assetAnimationSchema), warnings: z.array(z.string()),
  materials: z.array(z.object({ index: z.number().int().nonnegative(), name: z.string() })).optional(),
  recipe: assetImportRecipeSchema,
  importedAt: z.string(), previousRevision: z.string().uuid().nullable(),
  parentAssetId: assetIdSchema.optional(),
});
export type ProjectAsset = z.infer<typeof projectAssetSchema>;
export const assetImportResultSchema = z.object({ asset: projectAssetSchema, needsReview: z.boolean(), reasons: z.array(z.string()) });
export type AssetImportResult = z.infer<typeof assetImportResultSchema>;
export const assetProgressSchema = z.object({ id: assetIdSchema, stage: z.string(), message: z.string() });
export const assetPipelineRequests = [
  z.object({ operation: z.literal("assets.list") }),
  z.object({ operation: z.literal("assets.pending") }),
  z.object({ operation: z.literal("assets.preview"), id: assetIdSchema, revision: z.string().uuid().optional() }),
  z.object({ operation: z.literal("assets.import"), name: z.string().min(1).max(120), mode: z.enum(["managed", "external"]).default("managed"), recipe: assetImportRecipeSchema.optional() }),
  z.object({ operation: z.literal("assets.import-buffer"), name: z.string().min(1).max(120), bytes: z.instanceof(Uint8Array).refine((bytes) => bytes.length <= 128 * 1024 * 1024),
    format: z.literal("glb"), sourceAssetId: assetIdSchema.optional() }),
  z.object({ operation: z.literal("assets.reimport"), id: assetIdSchema, relocate: z.boolean().default(false), recipe: assetImportRecipeSchema.optional() }),
  z.object({ operation: z.literal("assets.accept"), id: assetIdSchema, revision: z.string().uuid() }),
  z.object({ operation: z.literal("assets.discard"), id: assetIdSchema, revision: z.string().uuid() }),
  z.object({ operation: z.literal("assets.undo"), id: assetIdSchema }),
  z.object({ operation: z.literal("assets.duplicate"), id: assetIdSchema, name: z.string().min(1).max(120) }),
  z.object({ operation: z.literal("assets.external"), id: assetIdSchema, action: z.enum(["open", "reveal"]) }),
  z.object({ operation: z.literal("assets.cancel"), id: assetIdSchema.optional() }),
  z.object({ operation: z.literal("assets.configure-blender") }),
];
