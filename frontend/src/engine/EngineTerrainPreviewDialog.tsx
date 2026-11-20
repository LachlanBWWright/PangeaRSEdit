import { useReducer, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { engineWorkspaceReducer, initialEngineWorkspace } from "./engineWorkspaceState";
import { useEnginePreview } from "./useEnginePreview";
import { useEngineAvailability } from "./useEngineAvailability";
import { downloadEnginePackage } from "./engineDownload";
import type { EnginePackage } from "./enginePackage";

const runtimeURL = `${import.meta.env.BASE_URL}generated/pangea-ports/wasm/sandbox/PangeaSandbox.html?package=foundation&embedded=1`;
export function EngineTerrainPreviewDialog({ packageData, onClose }: { packageData: EnginePackage; onClose: () => void }) {
  const [state, dispatch] = useReducer(engineWorkspaceReducer, packageData, (initial) => ({ ...initialEngineWorkspace(), packageData: initial }));
  const frame = useRef<HTMLIFrameElement>(null);
  const availability = useEngineAvailability(runtimeURL);
  useEnginePreview(frame, dispatch, packageData);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-w-5xl w-[95vw]">
    <DialogHeader><DialogTitle>Terrain in Lua Engine</DialogTitle><DialogDescription>This preview copies the floor heightfield. Items, textures, water, fences, ceilings and game scripts are not converted. Your original level stays open.</DialogDescription></DialogHeader>
    {availability === "available" && <iframe ref={frame} src={runtimeURL} title="Lua engine terrain preview" className="w-full h-[60vh] border-0" allow="gamepad" />}
    {availability === "missing" && <p>Build the runtime with scripts/build-games.sh --game sandbox, then reopen this preview.</p>}
    {availability === "loading" && <p>Checking local runtime…</p>}
    <p role="status">{state.runtime?.error || state.status}</p>
    <button className="rounded border px-3 py-2" onClick={() => downloadEnginePackage(packageData, dispatch)}>Download terrain package</button>
  </DialogContent></Dialog>;
}
