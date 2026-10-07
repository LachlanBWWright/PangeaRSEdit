import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Game, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
import { SelectedCustomPlacementAtom } from "../scripts/scriptPlacementSelectionState";
import { scriptEditorNavigationAtom } from "../scripts/scriptEditorNavigation";
import { createScriptWorkspaceContext, ensureScriptWorkspace, moveCustomPlacement, replaceScriptWorkspace, scriptWorkspaceStoreAtom, setScriptActiveFile } from "../scripts/scriptWorkspaceState";
import { getLevelState } from "../scripts/scriptWorkspaceHelpers";
import { requestMapItemCommandAtom } from "./mapItemEditingContext";
import { ScriptInstanceParametersPanel } from "../scripts/ScriptInstanceParametersPanel";
import type { ScriptParameterValues } from "../scripts/scriptWorkspaceStateTypes";

const axes: readonly ("x" | "y" | "z")[] = ["x", "y", "z"];

export function CustomObjectItemPicker() {
  const globals = useAtomValue(Globals);
  const level = useAtomValue(LevelNumber);
  const selectedId = useAtomValue(SelectedCustomPlacementAtom);
  const [store, setStore] = useAtom(scriptWorkspaceStoreAtom);
  const navigate = useSetAtom(scriptEditorNavigationAtom);
  const setView = useSetAtom(ActiveView);
  const command = useSetAtom(requestMapItemCommandAtom);
  const context = createScriptWorkspaceContext(globals, level ?? null);
  const workspace = ensureScriptWorkspace(store, context);
  const placement = getLevelState(workspace).customPlacements.find(item => item.id === selectedId);
  if (!placement) return null;
  const definition = workspace.customObjects.find(item => item.id === placement.objectId);
  function rename(label: string) {
    if (!label.trim() || !placement) return;
    setStore(current => {
      const state = ensureScriptWorkspace(current, context);
      const levelState = getLevelState(state);
      return replaceScriptWorkspace(current, {...state, levels: {...state.levels, [context.levelKey]: {...levelState, customPlacements: levelState.customPlacements.map(item => item.id === placement.id ? {...item, label: label.trim()} : item)}}});
    });
  }
  function position(axis: "x" | "y" | "z", value: string) {
    if (!value.trim() || !placement) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setStore(current => {
      const state = ensureScriptWorkspace(current, context);
      const currentPlacement = getLevelState(state).customPlacements.find(item => item.id === placement.id);
      if (!currentPlacement) return current;
      return replaceScriptWorkspace(current, moveCustomPlacement(state, placement.id, {...currentPlacement.position, [axis]: number}));
    });
  }
  function editDefinition() {
    if (!definition) return;
    setStore(current => replaceScriptWorkspace(current, setScriptActiveFile(ensureScriptWorkspace(current, context), definition.sourceFilePath)));
    navigate(previous => ({gameId: context.gameId, filePath: definition.sourceFilePath, line: 1, column: 1, sequence: (previous?.sequence ?? 0) + 1}));
    setView(View.scripts);
  }
  function parameters(values: ScriptParameterValues) {
    if (!placement) return;
    setStore(current => {
      const state = ensureScriptWorkspace(current, context);
      const levelState = getLevelState(state);
      return replaceScriptWorkspace(current, {...state, levels: {...state.levels, [context.levelKey]: {...levelState, customPlacements: levelState.customPlacements.map(item => item.id === placement.id ? {...item, parameters: values} : item)}}});
    });
  }
  return <section className="flex min-w-0 flex-col gap-2" aria-label="Lua item inspector">
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
      <Label htmlFor="custom-item-label">Instance name</Label>
      <Input className="h-7" id="custom-item-label" key={`${placement.id}-${placement.label}`} defaultValue={placement.label} onBlur={event => rename(event.target.value)} />
    </div>
    <p className="truncate text-xs text-muted-foreground" title={definition?.label ?? placement.objectId}>Definition: {definition?.label ?? placement.objectId}</p>
    <div className="grid grid-cols-3 gap-2">
      {axes.map(axis => <div key={axis}>
        <Label htmlFor={`custom-item-${axis}`}>{axis === "y" && globals.GAME_TYPE !== Game.MIGHTY_MIKE ? "Elevation" : `World ${axis.toUpperCase()}`}</Label>
        <Input className="h-7" id={`custom-item-${axis}`} key={`${placement.id}-${axis}-${placement.position[axis]}`} type="number" defaultValue={placement.position[axis]} onBlur={event => position(axis, event.target.value)} />
      </div>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!definition} onClick={editDefinition}>Edit behavior</Button>
      <Dialog>
        <DialogTrigger asChild><Button size="sm" variant="outline">Parameters</Button></DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Instance behavior parameters</DialogTitle></DialogHeader>
          <ScriptInstanceParametersPanel workspace={workspace} placement={placement} onChange={parameters} />
        </DialogContent>
      </Dialog>
      <Button size="sm" variant="outline" onClick={() => command("duplicate")}>Duplicate</Button>
      <Button size="sm" variant="destructive" onClick={() => command("delete")}>Delete</Button>
    </div>
  </section>;
}
