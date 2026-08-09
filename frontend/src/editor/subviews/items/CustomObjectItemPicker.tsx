import { useAtom, useAtomValue } from "jotai";
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

export function CustomObjectItemPicker() {
  const globals = useAtomValue(Globals);
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
        moveCustomPlacement(workspace, selectedPlacement.id, position),
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
        removeCustomPlacement(workspace, selectedPlacement.id),
      ),
    );
    setSelectedPlacementId(null);
  };

  useEffect(() => () => setObjectId(null), [setObjectId]);

  if (workspace.customObjects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 border-t pt-3 text-center">
      {selectedPlacement && (
        <div className="grid w-full grid-cols-2 gap-2 text-left">
          <p className="col-span-2 text-center text-sm font-medium">
            {selectedPlacement.label}
          </p>
          {(["x", "y", "z"] as const).map((axis) => (
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
          <Button
            className="col-span-2"
            variant="destructive"
            onClick={deleteSelectedPlacement}
          >
            Delete Item
          </Button>
        </div>
      )}
      <p className="text-sm font-medium">Scripted items</p>
      <Select
        value={objectId ?? ""}
        onValueChange={(value) => {
          setNativeItemType(undefined);
          setObjectId(value);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a scripted item" />
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
