import { useEffect, useEffectEvent, type Dispatch, type RefObject } from "react";
import { engineMessageSchema } from "./engineSchemas";
import type { EngineWorkspaceAction } from "./engineWorkspaceState";
import type { EnginePackage } from "./enginePackage";
import { postEnginePackage, postEngineScene } from "./engineWorkspaceState";

export function useEnginePreview(frame: RefObject<HTMLIFrameElement | null>, dispatch: Dispatch<EngineWorkspaceAction>, packageData: EnginePackage, sceneId?: string) {
  const synchronize = useEffectEvent((message: "ready" | "loaded") => {
    if (message === "ready") postEnginePackage(packageData, frame, dispatch);
    else if (sceneId) postEngineScene(sceneId, frame);
  });
  useEffect(() => {
    dispatch({ type: "previewReset" });
    function receive(event: MessageEvent<unknown>) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const parsed = engineMessageSchema.safeParse(event.data);
      if (!parsed.success) return;
      dispatch({ type: "runtime", message: parsed.data });
      if (parsed.data.type === "pangea.ready") synchronize("ready");
      if (parsed.data.type === "pangea.loaded" && parsed.data.ok) synchronize("loaded");
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [frame, dispatch]);
}
