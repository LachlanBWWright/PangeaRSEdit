import { atom } from "jotai";

type ItemSelection = { kind: "native"; index: number } | { kind: "custom"; id: string } | null;
type ItemPlacement = { kind: "native"; type: number } | { kind: "custom"; id: string } | null;

const selection = atom<ItemSelection>(null);
const placement = atom<ItemPlacement>(null);

export const SelectedItem = atom(
  (get) => { const item = get(selection); return item?.kind === "native" ? item.index : undefined; },
  (_get, set, index: number | undefined) => set(selection, index === undefined ? null : { kind: "native", index }),
);

export const SelectedCustomPlacementAtom = atom(
  (get) => { const item = get(selection); return item?.kind === "custom" ? item.id : null; },
  (get, set, id: string | null) => {
    if (id !== null) set(selection, { kind: "custom", id });
    else if (get(selection)?.kind === "custom") set(selection, null);
  },
);

export const ClickToAddItem = atom(
  (get) => { const item = get(placement); return item?.kind === "native" ? item.type : undefined; },
  (get, set, type: number | undefined) => {
    if (type !== undefined) set(placement, { kind: "native", type });
    else if (get(placement)?.kind === "native") set(placement, null);
  },
);

export const CustomObjectToPlaceAtom = atom(
  (get) => { const item = get(placement); return item?.kind === "custom" ? item.id : null; },
  (get, set, id: string | null) => {
    if (id !== null) set(placement, { kind: "custom", id });
    else if (get(placement)?.kind === "custom") set(placement, null);
  },
);
