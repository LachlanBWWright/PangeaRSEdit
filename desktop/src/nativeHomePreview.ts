import path from "node:path";
import { convertModelFiles } from "@pangea/model-codec/node";
import { GAME_ASSET_CATALOG, nativeAssetCandidates, type GameId, type HostError } from "@pangea/desktop-contracts";
import { err, ok, type Result } from "neverthrow";
import { failure } from "./files.ts";
import { NativeAssetIndex } from "./nativeAssetIndex.ts";
import { DerivedAssetCache } from "./derivedAssetCache.ts";

export async function resolveNativeFile(index: NativeAssetIndex, root: string, game: GameId, relative: string): Promise<Result<string | null, HostError>> {
  for (const candidate of nativeAssetCandidates(game, relative)) {
    const resolved = await index.resolve(root, candidate);
    if (resolved.isErr() || resolved.value) return resolved;
  }
  return ok(null);
}

export async function buildHomePreview(index: NativeAssetIndex, cache: DerivedAssetCache, root: string, game: GameId): Promise<Result<string, HostError>> {
  const definition = GAME_ASSET_CATALOG[game].home;
  if (!definition) return err(failure("This game has no 3D home model", "unsupported"));
  const model = await resolveNativeFile(index, root, game, `Skeletons/${definition.model}`);
  if (model.isErr()) return err(model.error);
  const skeleton = await resolveNativeFile(index, root, game, `Skeletons/${definition.skeleton}`);
  if (skeleton.isErr()) return err(skeleton.error);
  if (!model.value || !skeleton.value) return err(failure(`Missing home model or skeleton for ${game}`, "missing"));
  const modelName = `model${path.extname(model.value)}`;
  return cache.get({ id: `home/${game}`, version: 2, extension: "glb", dependencies: [
    { name: modelName, path: model.value }, { name: "model.skeleton.rsrc", path: skeleton.value },
  ], build: async (directory) => {
    const output = path.join(directory, "preview.glb");
    const converted = await convertModelFiles(path.join(directory, modelName), output,
      { skeleton: path.join(directory, "model.skeleton.rsrc") });
    return converted.isErr() ? err(failure(converted.error, "conversion")) : ok(output);
  } });
}
