import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { HostError, ProjectFile, SpriteAsset } from "@pangea/desktop-contracts";
import { spriteSourcePath, readSpriteSource } from "./spriteSources.ts";

export async function exportPortableSprites(root: string, records: readonly SpriteAsset[], includeSources: boolean): Promise<Result<{ assets: SpriteAsset[]; files: ProjectFile[] }, HostError>> {
  const assets: SpriteAsset[] = [];
  const files: ProjectFile[] = [];
  for (const asset of records) {
    const destination = `AuthoringSources/${asset.id}/portable`;
    const source = { ...asset.source, mode: "managed", imagePath: `${destination}/source.png`,
      metadataPath: asset.source.metadataPath ? `${destination}/source.json` : null,
      authoringPath: asset.source.authoringPath ? `${destination}/source.aseprite` : null };
    const portable: SpriteAsset = { ...asset, source: { ...source, mode: "managed" } };
    assets.push(portable);
    if (!includeSources) continue;
    for (const [original, target] of [[asset.source.imagePath, portable.source.imagePath],
      [asset.source.metadataPath, portable.source.metadataPath], [asset.source.authoringPath, portable.source.authoringPath]]) {
      if (!original || !target) continue;
      const resolved = await spriteSourcePath(root, { ...asset.source, imagePath: original });
      if (resolved.isErr()) return err(resolved.error);
      const bytes = await readSpriteSource(resolved.value);
      if (bytes.isErr()) return err({ ...bytes.error, message: `${asset.name}: cannot include ${path.basename(original)}. Relink its source or export without authoring sources.` });
      files.push({ path: target, bytes: Uint8Array.from(bytes.value) });
    }
  }
  return ok({ assets, files });
}
