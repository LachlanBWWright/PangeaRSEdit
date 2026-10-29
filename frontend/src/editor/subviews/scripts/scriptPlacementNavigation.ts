import { atom } from "jotai";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { View } from "@/editor/viewEnum";
import { CustomObjectToPlaceAtom, SelectedCustomPlacementAtom } from "./scriptPlacementSelectionState";

export const startCustomObjectPlacementAtom = atom(null, (_get, set, objectId: string) => {
  set(SelectedItem, undefined);
  set(ClickToAddItem, undefined);
  set(CustomObjectToPlaceAtom, objectId);
  set(ActiveView, View.items);
});

export const inspectCustomObjectPlacementAtom = atom(null, (_get, set, placementId: string) => {
  set(SelectedItem, undefined);
  set(CustomObjectToPlaceAtom, null);
  set(ClickToAddItem, undefined);
  set(SelectedCustomPlacementAtom, placementId);
  set(ActiveView, View.items);
});
