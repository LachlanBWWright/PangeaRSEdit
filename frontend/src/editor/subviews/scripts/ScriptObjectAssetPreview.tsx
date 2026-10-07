import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MiniThreeView } from "@/editor/gameCards/MiniThreeView";
import type { ScriptAssetFile } from "./scriptWorkspaceState";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import type { ObjectModelBounds } from "./scriptObjectModelBounds";
import { buildObjectModelPreviewURL, objectPreviewGame } from "./scriptObjectModelPreview";

export function ScriptObjectAssetPreview({ asset, gameId, definition, onUpdate }: { readonly asset: ScriptAssetFile; readonly gameId: string; readonly definition: ScriptCustomObjectDefinition; readonly onUpdate: (definition: ScriptCustomObjectDefinition) => void }) {
  const [preview, setPreview] = useState<{ asset: ScriptAssetFile; url: string; bounds: ObjectModelBounds | null; scale: number; index: number | undefined } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const visual = definition.visual;
  if (visual.kind !== "customDisplayGroup" && visual.kind !== "customSkeleton") return null;
  const index = visual.kind === "customDisplayGroup" ? visual.modelObject : undefined;
  const current = preview?.asset === asset && preview.scale === visual.scale && preview.index === index ? preview : null;
  if (!asset.path.endsWith(".bg3d") && !asset.path.endsWith(".3dmf")) return null;
  return <div className="grid gap-2">
    <Button variant="outline" disabled={working} onClick={async () => {
      setWorking(true); setError("");
      const result = await buildObjectModelPreviewURL(asset, visual.scale, index);
      if (!alive.current) { if (result.isOk()) URL.revokeObjectURL(result.value.url); return; }
      setWorking(false);
      if (result.isErr()) { setError(result.error); return; }
      setPreview({ asset, url: result.value.url, bounds: result.value.bounds.unwrapOr(null), scale: visual.scale, index });
      if (result.value.bounds.isErr()) setError(result.value.bounds.error);
    }}>{working ? "Preparing preview…" : "Preview attached model"}</Button>
    {error ? <p role="status" className="text-xs text-red-300">{error}</p> : null}
    {current ? <><MiniThreeView gltfUrl={current.url} gameType={objectPreviewGame(gameId)} className="h-64 w-full" /><p className="text-xs text-slate-400">Shows the whole uploaded asset. The selected model and visual scale determine the fitted box; separate skeleton animations are configured independently.</p>
      {current.bounds ? <Button variant="outline" onClick={() => {
        if (!current.bounds) return;
        onUpdate({ ...definition, collision: { kind: "preset", preset: definition.collision.kind === "preset" ? definition.collision.preset : "solidBox", bounds: current.bounds } });
      }}>Use selected model’s collision dimensions</Button> : null}
    </> : null}
  </div>;
}
