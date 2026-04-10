import { atom } from "jotai";
import { View } from "@/editor/viewEnum";
import { SelectedFence, SelectedFenceNub } from "../fences/fenceAtoms";
import {
  SelectedSpline,
  SelectedSplineItem,
  SelectedSplineNub,
} from "../splines/splineAtoms";
import { SelectedItem } from "../items/itemAtoms";
import { SelectedWaterBody, SelectedWaterNub } from "../water/waterAtoms";

const _activeViewAtom = atom<View>(View.fences);

/**
 * Global active-view atom.
 *
 * Reading returns the current View.
 * Writing to it clears the selection state belonging to *other* views so
 * that only one entity type can ever be selected at a time. Specifically:
 *  - switching away from fences → clears SelectedFence + SelectedFenceNub
 *  - switching away from splines → clears SelectedSpline + SelectedSplineItem + SelectedSplineNub
 *  - switching away from items → clears SelectedItem
 *  - switching away from water → clears SelectedWaterBody + SelectedWaterNub
 */
export const ActiveView = atom(
  (get) => get(_activeViewAtom),
  (get, set, newView: View) => {
    set(_activeViewAtom, newView);

    if (newView !== View.fences) {
      set(SelectedFence, undefined);
      set(SelectedFenceNub, null);
    }
    if (newView !== View.splines) {
      set(SelectedSpline, undefined);
      set(SelectedSplineItem, undefined);
      set(SelectedSplineNub, null);
    }
    if (newView !== View.items) {
      set(SelectedItem, undefined);
    }
    if (newView !== View.water) {
      set(SelectedWaterBody, null);
      set(SelectedWaterNub, null);
    }
  },
);
