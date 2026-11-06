import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globals } from "@/data/globals/globals";
import { scriptLevelNumberAtom } from "../scripts/scriptLevelNumber";
import { ClickToAddItem } from "@/data/items/itemAtoms";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { getItemName } from "@/data/items/getItemNames";
import { getAllItemValues } from "./itemMenuState";
import { CustomObjectToPlaceAtom } from "../scripts/scriptPlacementSelectionState";
import { createScriptWorkspaceContext, ensureScriptWorkspace, scriptWorkspaceStoreAtom } from "../scripts/scriptWorkspaceState";

export function ItemPlacementPicker({ itemValues, renderNativeItem, onNativeSelection, resetOnUnmount = true }: {
  itemValues?: number[];
  renderNativeItem?: (itemType: number) => ReactNode;
  onNativeSelection?: () => void;
  resetOnUnmount?: boolean;
}) {
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(scriptLevelNumberAtom);
  const store = useAtomValue(scriptWorkspaceStoreAtom);
  const [nativeType, setNativeType] = useAtom(ClickToAddItem);
  const [objectId, setObjectId] = useAtom(CustomObjectToPlaceAtom);
  const workspace = ensureScriptWorkspace(store, createScriptWorkspaceContext(globals, levelNumber ?? null));
  const nativeValues = itemValues ?? getAllItemValues(globals);
  const customObjects = ENABLE_SCRIPTS ? workspace.customObjects : [];
  const active = nativeType !== undefined || (ENABLE_SCRIPTS && objectId !== null);

  useEffect(() => () => {
    if (!resetOnUnmount) return;
    setNativeType(undefined);
    setObjectId(null);
  }, [resetOnUnmount, setNativeType, setObjectId]);

  return <div className="flex flex-col gap-2">
    <Label htmlFor="item-to-place">Item</Label>
    <Select value={ENABLE_SCRIPTS && objectId !== null ? `custom:${objectId}` : nativeType === undefined ? "" : `native:${nativeType}`}
      onValueChange={(value) => {
        const custom = customObjects.find((definition) => `custom:${definition.id}` === value);
        if (custom) {
          setNativeType(undefined);
          setObjectId(custom.id);
          return;
        }
        const native = nativeValues.find((itemType) => `native:${itemType}` === value);
        if (native === undefined) return;
        onNativeSelection?.();
        setObjectId(null);
        setNativeType(native);
      }}>
      <SelectTrigger id="item-to-place"><SelectValue placeholder="Select an item" /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Built-in items</SelectLabel>
          {nativeValues.map((itemType) => <SelectItem key={itemType} value={`native:${itemType}`}>
            {renderNativeItem ? renderNativeItem(itemType) : getItemName(globals, itemType)}
          </SelectItem>)}
        </SelectGroup>
        {customObjects.length > 0 && <SelectGroup>
          <SelectLabel>Custom items</SelectLabel>
          {customObjects.map((definition) => <SelectItem key={definition.id} value={`custom:${definition.id}`}>{definition.label}</SelectItem>)}
        </SelectGroup>}
      </SelectContent>
    </Select>
    {active && <>
      <p className="text-sm">Click on the canvas to add the selected item</p>
      <Button variant="destructive" onClick={() => { setNativeType(undefined); setObjectId(null); }}>Stop Adding Items</Button>
    </>}
  </div>;
}
