import { useState } from "react";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { Game, Globals } from "@/data/globals/globals";
import { SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline, SelectedSplineItem } from "@/data/splines/splineAtoms";
import { getSelectedItem } from "@/editor/subviews/items/itemMenuState";
import type { HeaderData, ItemData, SplineData } from "@/python/structSpecs/LevelTypes";
import { ScriptNativeBindingsPanel } from "./ScriptNativeBindingsPanel";
import { buildSelectionLabel, getLevelState, getSelectedSplineItem } from "./scriptWorkspaceHelpers";
import { getNativeReplacementCompatibility } from "./scriptNativeAudit";
import {
  removeBindingById, replaceMapItemWithCustomObject, replaceSplineItemWithCustomObject, replaceTerrainItemWithCustomObject,
  removeMapItemReplacement, removeSplineItemReplacement, removeTerrainItemReplacement,
  type ScriptWorkspaceState,
} from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

export function ScriptNativeSelection({ workspace, update, headerData, itemData, splineData }: {
  workspace: ScriptWorkspaceState; update: UpdateScriptWorkspace;
  headerData: HeaderData; itemData: ItemData | null; splineData: SplineData | null;
}) {
  const globals = useAtomValue(Globals);
  const itemIndex = useAtomValue(SelectedItem);
  const splineNum = useAtomValue(SelectedSpline);
  const splineIndex = useAtomValue(SelectedSplineItem);
  const item = itemData ? getSelectedItem(itemData, itemIndex) : null;
  const spline = getSelectedSplineItem(splineData, splineNum, splineIndex);
  const level = getLevelState(workspace);
  const kind = spline ? "splineItem" : item ? globals.GAME_TYPE === Game.MIGHTY_MIKE ? "mapItem" : "terrainItem" : null;
  const [target, setTarget] = useState("");
  const objectId = workspace.customObjects.some((object) => object.id === target) ? target : workspace.customObjects[0]?.id;
  const surface = kind === "mapItem" ? "map" : kind === "splineItem" ? "spline" : "terrain";
  const compatibility = kind ? getNativeReplacementCompatibility(workspace.context.gameId, spline?.type ?? item?.type ?? -1, surface) : null;
  const replaced = kind === "splineItem"
    ? level.splineReplacements.some((entry) => entry.splineNum === splineNum && entry.itemIndex === splineIndex)
    : kind === "mapItem" ? level.mapReplacements.some((entry) => entry.itemIndex === itemIndex)
      : level.terrainReplacements.some((entry) => entry.itemIndex === itemIndex);
  const replace = () => update((state) => {
    if (!objectId || !compatibility?.allowed) return state;
    if (kind === "splineItem" && spline && splineNum !== undefined && splineIndex !== undefined) {
      return replaceSplineItemWithCustomObject(state, { id: `spline-${splineNum}-${splineIndex}`, splineNum, itemIndex: splineIndex, nativeType: spline.type, placement: spline.placement, customObjectId: objectId, strict: false });
    }
    if (!item || itemIndex === undefined) return state;
    if (kind === "mapItem") return replaceMapItemWithCustomObject(state, { id: `map-${itemIndex}`, itemIndex, nativeType: item.type, x: item.x, y: item.z, customObjectId: objectId, strict: false });
    return replaceTerrainItemWithCustomObject(state, { id: `terrain-${itemIndex}`, itemIndex, nativeType: item.type, x: item.x, z: item.z, customObjectId: objectId, strict: false });
  });
  return <section className="grid content-start gap-5 min-w-0">
    <div><h3>Selected native item</h3><p className="workbench-muted">Attach a spawn handler or substitute a custom object.</p></div>
    <ScriptNativeBindingsPanel selectionTargetKind={kind} selectionLabel={buildSelectionLabel(globals, item, spline)}
      terrainSelectionSignature={kind === "terrainItem" && item ? { itemType: item.type, position: { x: item.x, y: headerData.Hedr[1000].obj.minY ?? 0, z: item.z }, flags: item.flags, params: [item.p0, item.p1, item.p2, item.p3] } : null}
      splineSelectionSignature={kind === "splineItem" && spline && splineNum !== undefined ? { itemType: spline.type, splineNum, placement: spline.placement, params: [spline.p0, spline.p1, spline.p2, spline.p3] } : null}
      mapItemSelectionSignature={kind === "mapItem" && item ? { itemType: item.type, position: { x: item.x, y: item.z }, params: [item.p0, item.p1, item.p2, item.p3] } : null}
      terrainBindings={level.terrainBindings} splineBindings={level.splineBindings} mapItemBindings={level.mapItemBindings}
      onRemoveBinding={(id) => update((state) => removeBindingById(state, id))} />
    {kind && <div className="grid gap-3 rounded-lg border border-slate-700 p-4"><h3>Replace with a custom object</h3><p className="workbench-muted">{compatibility?.message}</p>
      {objectId ? <><select className="h-9 w-full rounded-md border border-slate-600 bg-slate-900 px-3" aria-label="Replacement object" value={objectId} onChange={(event) => setTarget(event.target.value)}>{workspace.customObjects.map((object) => <option key={object.id} value={object.id}>{object.label}</option>)}</select><Button variant="secondary" disabled={!compatibility?.allowed} onClick={replace}>Replace selected item</Button></> : <p className="workbench-muted">Create a definition in Objects first.</p>}
      {replaced && <Button variant="ghost" onClick={() => update((state) => {
        if (kind === "splineItem" && splineNum !== undefined && splineIndex !== undefined) return removeSplineItemReplacement(state, splineNum, splineIndex);
        if (itemIndex === undefined) return state;
        return kind === "mapItem" ? removeMapItemReplacement(state, itemIndex) : removeTerrainItemReplacement(state, itemIndex);
      })}>Restore native item</Button>}
    </div>}
  </section>;
}
