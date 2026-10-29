import { useEffect, useMemo, useState } from "react";
import { useAssetState } from "@/assets/useAssetState";
import type { Game } from "@/data/globals/globals";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "../scripts/scriptWorkspaceState";
import { customThumbnailSource } from "./customItemThumbnailSource";
import { loadCustomItemThumbnail } from "./customItemThumbnailLoader";
import type { CustomItemThumbnail } from "./customItemThumbnailScene";

export function useCustomItemThumbnail(game: Game, level: number, definition: ScriptCustomObjectDefinition | undefined, assets: ScriptWorkspaceState["assets"], enabled: boolean, metadata?: Readonly<Record<string, string>>): CustomItemThumbnail | null {
  const { revision } = useAssetState();
  const source = useMemo(() => definition ? customThumbnailSource(game, level, definition, metadata) : null, [game, level, definition, metadata]);
  const identity = useMemo(() => ({ source, assets, revision }), [source, assets, revision]);
  const [loaded, setLoaded] = useState<{ identity: object; thumbnail: CustomItemThumbnail } | null>(null);
  useEffect(() => {
    if (!enabled || !source) return;
    let active = true;
    void loadCustomItemThumbnail(game, source, assets).then((result) => {
      if (active && result.isOk()) setLoaded({ identity, thumbnail: result.value });
    });
    return () => { active = false; };
  }, [game, source, assets, enabled, identity]);
  return enabled && loaded?.identity === identity ? loaded.thumbnail : null;
}
