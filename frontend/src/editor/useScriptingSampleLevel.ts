import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getFeatureFlags, setFeatureFlags } from "@/config/featureFlags";
import type { OpenFileArgs } from "./loadLogic/openFile";
import { replaceScriptWorkspace, type ScriptWorkspaceState } from "./subviews/scripts/scriptWorkspaceState";
import { loadScriptingSampleLevel, type ScriptingSampleLevel } from "./subviews/scripts/scriptSampleLevels";
import { previewLevelNumber } from "./utils/previewLevelNumbers";

export function useScriptingSampleLevel(handlers: Omit<OpenFileArgs, "url" | "gameType">,
  setScriptStore: (update: (store: Readonly<Record<string, ScriptWorkspaceState>>) => Readonly<Record<string, ScriptWorkspaceState>>) => void,
  setBaseLevel: (level: number) => void) {
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => () => { generation.current++; }, []);
  async function openSample(sample: ScriptingSampleLevel) {
    if (pending.current || !getFeatureFlags().sampleScriptingLevels) return;
    pending.current = true; setLoading(true);
    const token = ++generation.current;
    const result = await loadScriptingSampleLevel(sample);
    if (generation.current !== token) return;
    pending.current = false; setLoading(false);
    if (result.isErr()) { toast.error("Could not open scripting sample", { description: result.error }); return; }
    const enabled = setFeatureFlags({ ...getFeatureFlags(), scripting: true });
    if (enabled.isErr()) { toast.error("Could not enable scripting", { description: enabled.error.message }); return; }
    const loaded = result.value;
    handlers.setGlobals(sample.globals);
    setBaseLevel(previewLevelNumber(sample.globals.GAME_TYPE, sample.level));
    setScriptStore((store) => replaceScriptWorkspace(store, loaded.workspace));
    handlers.setData(loaded.data); handlers.setMapImages(loaded.images);
    handlers.setMapImagesFile(loaded.mapImagesFile); handlers.setMapFile(loaded.mapFile);
    toast.success(sample.title, { description: "Open Scripts to edit the Lua encounter, or Preview in game to play." });
  }
  return { loading, openSample };
}
