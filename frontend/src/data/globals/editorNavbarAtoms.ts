import { atom } from "jotai";
import type { ReactNode } from "react";

/** Controls whether the editor navbar is visible. */
export const editorNavbarOpenAtom = atom(false);
/** Holds the left-side content rendered inside the editor navbar. */
export const editorNavbarLeftAtom = atom<ReactNode>(null);
/** Holds the action buttons rendered inside the editor navbar. */
export const editorNavbarActionsAtom = atom<ReactNode>(null);
/** Holds the tab content rendered inside the editor navbar. */
export const editorNavbarTabsAtom = atom<ReactNode>(null);
