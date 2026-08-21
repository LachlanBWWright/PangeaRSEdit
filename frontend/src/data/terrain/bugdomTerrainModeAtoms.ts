import { atom } from "jotai";

export type BugdomTerrainMode = "topology" | "vertex-colors";

export const bugdomTerrainModeAtom = atom<BugdomTerrainMode>("topology");
