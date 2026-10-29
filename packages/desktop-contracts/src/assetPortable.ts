import { z } from "zod";
import { projectAssetSchema } from "./assetPipeline.ts";

const pathSchema = z.string().max(240).refine((value) => !value.startsWith("/") && !value.includes("\\")
  && value.split("/").every((part) => part.length > 0 && part !== "." && part !== ".."));
export const portableAssetFileSchema = z.object({ path: pathSchema, bytes: z.instanceof(Uint8Array).refine((bytes) => bytes.byteLength <= 128 * 1024 * 1024) });
export const portableAssetsSchema = z.object({ version: z.literal(1), assets: z.array(projectAssetSchema).max(512),
  files: z.array(portableAssetFileSchema).max(8192), warnings: z.array(z.string()).max(1024) });
export type PortableAssets = z.infer<typeof portableAssetsSchema>;
export const portableAssetImportSchema = z.object({ id: z.string().uuid(), assets: z.array(projectAssetSchema) });
export const portableAssetRequests = [
  z.object({ operation: z.literal("assets.export-bundle"), ids: z.array(z.string().uuid()).max(512), includeSources: z.boolean() }),
  z.object({ operation: z.literal("assets.import-bundle"), attachment: portableAssetsSchema }),
  z.object({ operation: z.literal("assets.import-reversible"), attachment: portableAssetsSchema }),
  z.object({ operation: z.literal("assets.undo-import"), id: z.string().uuid() }),
];

export function remapPortableAssets(bundle: PortableAssets, identities: ReadonlyMap<string, string>): PortableAssets {
  const remap = (value: string) => {
    for (const [previous, next] of identities) {
      for (const root of ["Assets/Models", "AuthoringSources"]) {
        const prefix = `${root}/${previous}/`;
        if (value.startsWith(prefix)) return `${root}/${next}/${value.slice(prefix.length)}`;
      }
    }
    return value;
  };
  return { ...bundle, assets: bundle.assets.map((asset) => ({ ...asset,
    id: identities.get(asset.id) ?? asset.id, previousRevision: null,
    ...(asset.parentAssetId ? { parentAssetId: identities.get(asset.parentAssetId) ?? asset.parentAssetId } : {}),
    source: { ...asset.source, path: remap(asset.source.path), dependencies: asset.source.dependencies.map(remap) },
    outputs: { model: remap(asset.outputs.model), preview: remap(asset.outputs.preview),
      skeleton: asset.outputs.skeleton === null ? null : remap(asset.outputs.skeleton), files: asset.outputs.files.map(remap) },
  })), files: bundle.files.map((file) => ({ ...file, path: remap(file.path) })) };
}
