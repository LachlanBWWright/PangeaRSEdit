import { useEffect, useState } from "react";
import type { Result } from "neverthrow";
import type { Game } from "@/data/globals/globals";
import { useAssetState } from "@/assets/useAssetState";
import { loadCustomItemThumbnail } from "../items/customItemThumbnailLoader";
import type { CustomItemThumbnail } from "../items/customItemThumbnailScene";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export function useModelChoiceThumbnail(game: Game, path: string, index: number, assets: ScriptWorkspaceState["assets"], skeletonPath = "") {
  const { revision } = useAssetState();
  const [state, setState] = useState<{ game: Game; path: string; skeletonPath: string; index: number; assets: ScriptWorkspaceState["assets"]; revision: number; result: Result<CustomItemThumbnail, string> } | null>(null);
  useEffect(() => {
    let active = true;
    void loadCustomItemThumbnail(game, { modelPath: path, modelObject: index, skeletonPath, animation: 0, scale: 1 }, assets).then((result) => {
      if (active) setState({ game, path, skeletonPath, index, assets, revision, result });
    });
    return () => { active = false; };
  }, [game, path, skeletonPath, index, assets, revision]);
  return state?.game === game && state.path === path && state.skeletonPath === skeletonPath && state.index === index && state.assets === assets && state.revision === revision ? state.result : null;
}
