import { useEffect, useState } from "react";
import { err, type Result } from "neverthrow";
import type { Game } from "@/data/globals/globals";
import { useAssetState } from "@/assets/useAssetState";
import { customThumbnailSource, loadCustomThumbnailBytes } from "../items/customItemThumbnailSource";
import { readCatalogModel } from "./scriptCatalogImport";
import type { ObjectAnimationClip } from "./scriptAnimationMappings";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

async function loadClips(game: Game, modelPath: string, skeletonPath: string, assets: ScriptWorkspaceState["assets"]): Promise<Result<readonly ObjectAnimationClip[], string>> {
  const model = await loadCustomThumbnailBytes(game, modelPath, assets);
  if (model.isErr()) return err(model.error);
  const skeleton = await loadCustomThumbnailBytes(game, `${skeletonPath}.rsrc`, assets);
  if (skeleton.isErr()) return err(skeleton.error);
  const parsed = await readCatalogModel([
    { path: modelPath, bytes: new Uint8Array(model.value), sourceName: modelPath },
    { path: `${skeletonPath}.rsrc`, bytes: new Uint8Array(skeleton.value), sourceName: skeletonPath },
  ]);
  return parsed.map((value) => value.clips);
}

export function useObjectAnimationClips(game: Game, workspace: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition,
  metadata?: Readonly<Record<string, string>>): readonly ObjectAnimationClip[] {
  const { revision } = useAssetState();
  const skeletal = definition.visual.kind === "nativeSkeleton" || definition.visual.kind === "customSkeleton";
  const source = skeletal ? customThumbnailSource(game, workspace.context.levelNumber ?? 0, definition, metadata) : null;
  const modelPath = source?.modelPath ?? "";
  const skeletonPath = source?.skeletonPath ?? "";
  const assets = workspace.assets;
  const key = `${game}:${revision}:${modelPath}:${skeletonPath}`;
  const [loaded, setLoaded] = useState<{ key: string; assets: ScriptWorkspaceState["assets"]; clips: readonly ObjectAnimationClip[] } | null>(null);
  useEffect(() => {
    if (!modelPath || !skeletonPath) return;
    let active = true;
    void loadClips(game, modelPath, skeletonPath, assets).then((result) => {
      if (active && result.isOk()) setLoaded({ key, assets, clips: result.value });
    });
    return () => { active = false; };
  }, [game, modelPath, skeletonPath, assets, key]);
  return loaded?.key === key && loaded.assets === assets ? loaded.clips : [];
}
