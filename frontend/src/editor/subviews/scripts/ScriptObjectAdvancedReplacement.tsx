import { Button } from "@/components/ui/button";
import type { ScriptCustomObjectsPanelProps } from "./ScriptCustomObjectsPanel";

export function ScriptObjectAdvancedReplacement({ objectId, panel }: { readonly objectId: string; readonly panel: ScriptCustomObjectsPanelProps }) {
  if (!panel.selectedTerrainItem && !panel.selectedSplineItem && !panel.selectedMapItem) return null;
  return <details className="border-t border-slate-800 py-5 text-sm">
    <summary className="cursor-pointer">Advanced: replace selected native item</summary>
    <p className="my-3 text-xs text-slate-400">Replace the selected native item with this definition. New scripted items can be placed directly from the Items menu.</p>
    {panel.selectedTerrainItem ? <div className="grid gap-2"><p className="text-xs">{panel.terrainReplacementCompatibility?.message}</p><Button disabled={!panel.terrainReplacementCompatibility?.allowed} onClick={() => panel.onReplaceSelectedItem(objectId)}>Replace terrain item</Button>{panel.replacementObjectId === objectId ? <Button variant="outline" onClick={panel.onRestoreSelectedItem}>Restore native item</Button> : null}</div> : null}
    {panel.selectedSplineItem ? <div className="grid gap-2"><p className="text-xs">{panel.splineReplacementCompatibility?.message}</p><Button disabled={!panel.splineReplacementCompatibility?.allowed} onClick={() => panel.onReplaceSelectedSplineItem(objectId)}>Replace spline item</Button>{panel.splineReplacementObjectId === objectId ? <Button variant="outline" onClick={panel.onRestoreSelectedSplineItem}>Restore spline item</Button> : null}</div> : null}
    {panel.selectedMapItem ? <div className="grid gap-2"><p className="text-xs">{panel.mapReplacementCompatibility?.message}</p><Button disabled={!panel.mapReplacementCompatibility?.allowed} onClick={() => panel.onReplaceSelectedMapItem(objectId)}>Replace map item</Button>{panel.mapReplacementObjectId === objectId ? <Button variant="outline" onClick={panel.onRestoreSelectedMapItem}>Restore native item</Button> : null}</div> : null}
  </details>;
}
