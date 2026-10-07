import { useAtom, useAtomValue } from "jotai";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Game, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { getItemName } from "@/data/items/getItemNames";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { getAllItemValues } from "./itemMenuState";
import { getMightyMikeItemValues } from "./mightyMikeItemMenuState";
import { CustomObjectToPlaceAtom, SelectedCustomPlacementAtom } from "../scripts/scriptPlacementSelectionState";
import { mapItemSelectionAtom } from "./mapItemSelection";
import { createScriptWorkspaceContext, ensureScriptWorkspace, scriptWorkspaceStoreAtom } from "../scripts/scriptWorkspaceState";
import { draggedItemPaletteEntryAtom } from "./itemPaletteState";
import { ItemThumbnail } from "@/components/items/ItemThumbnail";
import { EmptyDataPrompt } from "../EmptyDataPrompts";
import { getItemLevelSupportLabel } from "@/data/items/itemLevelSupport";

export function ItemPalette({ hasItems, renderNativeItem }: {
  hasItems: boolean;
  renderNativeItem?: (itemType: number) => ReactNode;
}) {
  const globals = useAtomValue(Globals);
  const level = useAtomValue(LevelNumber);
  const store = useAtomValue(scriptWorkspaceStoreAtom);
  const [native, setNative] = useAtom(ClickToAddItem);
  const [custom, setCustom] = useAtom(CustomObjectToPlaceAtom);
  const [, setDragged] = useAtom(draggedItemPaletteEntryAtom);
  const selectedItem = useAtomValue(SelectedItem);
  const selectedCustomPlacement = useAtomValue(SelectedCustomPlacementAtom);
  const selection = useAtomValue(mapItemSelectionAtom);
  useEffect(() => () => { setNative(undefined); setCustom(null); setDragged(null); }, [setNative, setCustom, setDragged]);
  if (selectedItem !== undefined || selectedCustomPlacement !== null || selection.length > 0) return null;
  const nativeTypes = globals.GAME_TYPE === Game.MIGHTY_MIKE ? getMightyMikeItemValues(globals) : getAllItemValues(globals);
  const workspace = ensureScriptWorkspace(store, createScriptWorkspaceContext(globals, level ?? null));
  if (native === undefined && custom === null) {
    return <EmptyDataPrompt
      title={hasItems ? "No Item Selected" : "No Items"}
      description={hasItems ? "Select an item on the canvas or add another one." : "This level doesn't have any items yet. Add your first item to get started."}
      buttonText={hasItems ? "Add More Items" : "Add First Item"}
      onInitialize={() => setNative(nativeTypes[0])}
      fillHeight
    />;
  }
  return <div className="flex flex-col gap-2">
    <Select value={custom !== null ? `custom:${custom}` : `native:${native}`} onValueChange={value => {
      if (value.startsWith("custom:")) { setCustom(value.slice(7)); setNative(undefined); return; }
      const type = Number(value.slice(7));
      if (!nativeTypes.includes(type)) return;
      setNative(type); setCustom(null);
    }}>
      <SelectTrigger aria-label="Item to add"><SelectValue placeholder="Select an item" /></SelectTrigger>
      <SelectContent>
        {nativeTypes.map(type => <SelectItem key={type} value={`native:${type}`}>
          {renderNativeItem ? renderNativeItem(type) : <ItemThumbnail
            game={globals.GAME_TYPE}
            kind="terrainItem"
            itemType={type}
            levelNum={level ?? undefined}
            label={`${getItemName(globals, type)} — ${getItemLevelSupportLabel(globals.GAME_TYPE, "terrainItem", type, level)}`}
            compact
          />}
        </SelectItem>)}
        {ENABLE_SCRIPTS && workspace.customObjects.map(definition => <SelectItem key={definition.id} value={`custom:${definition.id}`}>{definition.label} (Lua)</SelectItem>)}
      </SelectContent>
    </Select>
    <Button variant="destructive" onClick={() => { setNative(undefined); setCustom(null); }}>Stop Adding Items</Button>
  </div>;
}
