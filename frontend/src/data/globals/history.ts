import { atom } from "jotai";

/** Blocks history updates while the flag is set. */
export const BlockHistoryUpdate = atom(false);
