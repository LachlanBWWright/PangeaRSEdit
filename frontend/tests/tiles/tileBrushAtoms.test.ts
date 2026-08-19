import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import {
  getSelectedTileBrushIdAtom,
  getTileBrushAnchorAtom,
  getTileBrushModeAtom,
} from "@/data/tileBrushes/tileBrushAtoms";

describe("game-scoped tile brush state", () => {
  it("keeps stamp selection independent between games", () => {
    const store = createStore();
    store.set(getSelectedTileBrushIdAtom("bugdom1"), "bugdom-stamp");

    expect(store.get(getSelectedTileBrushIdAtom("bugdom1"))).toBe(
      "bugdom-stamp",
    );
    expect(store.get(getSelectedTileBrushIdAtom("nanosaur1"))).toBeNull();
    expect(store.get(getSelectedTileBrushIdAtom("mightymike"))).toBeNull();
  });

  it("keeps placement mode and anchor independent between games", () => {
    const store = createStore();
    store.set(getTileBrushModeAtom("mightymike"), "stamp");
    store.set(getTileBrushAnchorAtom("mightymike"), "center");

    expect(store.get(getTileBrushModeAtom("mightymike"))).toBe("stamp");
    expect(store.get(getTileBrushAnchorAtom("mightymike"))).toBe("center");
    expect(store.get(getTileBrushModeAtom("bugdom1"))).toBe("select");
    expect(store.get(getTileBrushAnchorAtom("bugdom1"))).toBe("topLeft");
  });
});
