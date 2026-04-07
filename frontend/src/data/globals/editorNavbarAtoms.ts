import { atom } from "jotai";
import type { ReactNode } from "react";

export const editorNavbarOpenAtom = atom(false);
export const editorNavbarLeftAtom = atom<ReactNode>(null);
export const editorNavbarActionsAtom = atom<ReactNode>(null);
export const editorNavbarTabsAtom = atom<ReactNode>(null);
