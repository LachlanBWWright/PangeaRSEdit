import { atom } from "jotai";
import type {
  TileBrush,
  TileBrushAnchor,
  TileBrushGame,
  TileBrushMode,
} from "./tileBrushTypes";

export const tileBrushesAtom = atom<TileBrush[]>([]);
export const selectedTileBrushIdsAtom = atom<Record<TileBrushGame, string | null>>({
  bugdom1: null,
  nanosaur1: null,
  mightymike: null,
});
export const bugdomSelectedTileBrushIdAtom = atom(
  (get) => get(selectedTileBrushIdsAtom).bugdom1,
  (get, set, id: string | null) => {
    set(selectedTileBrushIdsAtom, {
      ...get(selectedTileBrushIdsAtom),
      bugdom1: id,
    });
  },
);
export const nanosaurSelectedTileBrushIdAtom = atom(
  (get) => get(selectedTileBrushIdsAtom).nanosaur1,
  (get, set, id: string | null) => {
    set(selectedTileBrushIdsAtom, {
      ...get(selectedTileBrushIdsAtom),
      nanosaur1: id,
    });
  },
);
export const mightyMikeSelectedTileBrushIdAtom = atom(
  (get) => get(selectedTileBrushIdsAtom).mightymike,
  (get, set, id: string | null) => {
    set(selectedTileBrushIdsAtom, {
      ...get(selectedTileBrushIdsAtom),
      mightymike: id,
    });
  },
);

export function getSelectedTileBrushIdAtom(game: TileBrushGame) {
  if (game === "bugdom1") return bugdomSelectedTileBrushIdAtom;
  if (game === "nanosaur1") return nanosaurSelectedTileBrushIdAtom;
  return mightyMikeSelectedTileBrushIdAtom;
}
const tileBrushModesAtom = atom<Record<TileBrushGame, TileBrushMode>>({
  bugdom1: "select",
  nanosaur1: "select",
  mightymike: "select",
});
const tileBrushAnchorsAtom = atom<Record<TileBrushGame, TileBrushAnchor>>({
  bugdom1: "topLeft",
  nanosaur1: "topLeft",
  mightymike: "topLeft",
});

function createTileBrushModeAtom(game: TileBrushGame) {
  return atom(
    (get) => get(tileBrushModesAtom)[game],
    (get, set, mode: TileBrushMode) => {
      set(tileBrushModesAtom, { ...get(tileBrushModesAtom), [game]: mode });
    },
  );
}

function createTileBrushAnchorAtom(game: TileBrushGame) {
  return atom(
    (get) => get(tileBrushAnchorsAtom)[game],
    (get, set, anchor: TileBrushAnchor) => {
      set(tileBrushAnchorsAtom, {
        ...get(tileBrushAnchorsAtom),
        [game]: anchor,
      });
    },
  );
}

const tileBrushModeAtoms = {
  bugdom1: createTileBrushModeAtom("bugdom1"),
  nanosaur1: createTileBrushModeAtom("nanosaur1"),
  mightymike: createTileBrushModeAtom("mightymike"),
};
const tileBrushAnchorAtoms = {
  bugdom1: createTileBrushAnchorAtom("bugdom1"),
  nanosaur1: createTileBrushAnchorAtom("nanosaur1"),
  mightymike: createTileBrushAnchorAtom("mightymike"),
};

export function getTileBrushModeAtom(game: TileBrushGame) {
  return tileBrushModeAtoms[game];
}

export function getTileBrushAnchorAtom(game: TileBrushGame) {
  return tileBrushAnchorAtoms[game];
}
export const tileBrushPreviewAtom = atom<{ x: number; y: number } | null>(null);
export const tileBrushActiveLayerAtom = atom<1000 | 1001>(1000);
