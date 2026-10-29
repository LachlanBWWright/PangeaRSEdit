import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ClickToAddItem } from "@/data/items/itemAtoms";
import { CustomPlacementParameters } from "../scripts/CustomObjectParameters";
import { openCustomObjectEditorAtom } from "../scripts/scriptAuthoringNavigation";
import type { UpdateScriptWorkspace } from "../scripts/useScriptWorkspace";
import {
  CustomObjectToPlaceAtom,
  SelectedCustomPlacementAtom,
} from "../scripts/scriptPlacementSelectionState";
import {
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  moveCustomPlacement,
  removeCustomPlacement,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
} from "../scripts/scriptWorkspaceState";

const POSITION_AXES: readonly ("x" | "y" | "z")[] = ["x", "y", "z"];

export function CustomObjectItemPicker() {
  const globals = useAtomValue(Globals);
  const openObjectEditor = useSetAtom(openCustomObjectEditorAtom);
  const levelNumber = useAtomValue(LevelNumber);
  const [workspaceStore, setWorkspaceStore] = useAtom(scriptWorkspaceStoreAtom);
  const [, setNativeItemType] = useAtom(ClickToAddItem);
  const [objectId, setObjectId] = useAtom(CustomObjectToPlaceAtom);
  const [selectedPlacementId, setSelectedPlacementId] = useAtom(
    SelectedCustomPlacementAtom,
  );
  const context = createScriptWorkspaceContext(globals, levelNumber ?? null);
  const workspace = ensureScriptWorkspace(workspaceStore, context);
  const selectedPlacement =
    workspace.levels[context.levelKey]?.customPlacements.find(
      (placement) => placement.id === selectedPlacementId,
    ) ?? null;
  const update: UpdateScriptWorkspace = (transform) => setWorkspaceStore((store) =>
    replaceScriptWorkspace(store, transform(ensureScriptWorkspace(store, context))),
  );

  const updateSelectedPosition = (axis: "x" | "y" | "z", value: string) => {
    if (!selectedPlacement) {
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const position = { ...selectedPlacement.position, [axis]: parsed };
    setWorkspaceStore((store) =>
      replaceScriptWorkspace(
        store,
        moveCustomPlacement(ensureScriptWorkspace(store, context), selectedPlacement.id, position),
      ),
    );
  };

  const deleteSelectedPlacement = () => {
    if (!selectedPlacement) {
      return;
    }
    setWorkspaceStore((store) =>
      replaceScriptWorkspace(
        store,
        removeCustomPlacement(ensureScriptWorkspace(store, context), selectedPlacement.id),
      ),
    );
    setSelectedPlacementId(null);
  };

  useEffect(() => () => setObjectId(null), [setObjectId]);

  if (workspace.customObjects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedPlacement && (
        <div className="grid w-full grid-cols-2 gap-2 text-left">
          <p className="col-span-2 text-center text-sm font-medium">
            {selectedPlacement.label}
          </p>
          <p className="col-span-2 text-sm text-slate-400">Selected placement — position and overrides affect only this item. Edit definition or behavior changes the shared object across all levels.</p>
          <div className="col-span-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => openObjectEditor({ gameId: context.gameId, definitionId: selectedPlacement.objectId, tab: "appearance" })}>Edit definition</Button>
            <Button size="sm" variant="secondary" onClick={() => openObjectEditor({ gameId: context.gameId, definitionId: selectedPlacement.objectId, tab: "behavior" })}>Edit behavior</Button>
            <Button size="sm" variant="ghost" onClick={() => openObjectEditor({ gameId: context.gameId, definitionId: selectedPlacement.objectId, tab: "usage" })}>Find instances</Button>
          </div>
          {POSITION_AXES.map((axis) => (
            <div key={axis} className={axis === "z" ? "col-span-2" : ""}>
              <Label htmlFor={`scripted-item-${axis}`}>{axis.toUpperCase()}</Label>
              <Input
                id={`scripted-item-${axis}`}
                type="number"
                value={selectedPlacement.position[axis]}
                onChange={(event) =>
                  updateSelectedPosition(axis, event.target.value)
                }
              />
            </div>
          ))}
          <div className="col-span-2"><CustomPlacementParameters workspace={workspace} placement={selectedPlacement} update={update} /></div>
          <Button
            className="col-span-2"
            variant="destructive"
            onClick={deleteSelectedPlacement}
          >
            Delete Item
          </Button>
        </div>
      )}
      <Label htmlFor="custom-item-type">Custom item</Label>
      <Select
        value={objectId ?? ""}
        onValueChange={(value) => {
          setNativeItemType(undefined);
          setObjectId(value);
        }}
      >
        <SelectTrigger id="custom-item-type">
          <SelectValue placeholder="Select a custom item" />
        </SelectTrigger>
        <SelectContent>
          {workspace.customObjects.map((definition) => (
            <SelectItem key={definition.id} value={definition.id}>
              {definition.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {objectId !== null && (
        <>
          <p className="text-sm">Click on the canvas to add the selected item</p>
          <Button variant="destructive" onClick={() => setObjectId(null)}>
            Stop Adding Items
          </Button>
        </>
      )}
    </div>
  );
}
