import { atom } from "jotai";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";

export interface ProjectCommands {
  save: () => Promise<void>;
  test: (withScripts?: boolean) => Promise<void>;
  recover: () => Promise<void>;
  discard: () => void;
  baseLevel: number;
  canSave: boolean;
  setBaseLevel: (level: number) => void;
}
export const desktopProjectAtom = atom<ProjectSnapshot | null>(null);
export const desktopLevelIdAtom = atom<string | null>(null);
export const desktopProjectDirtyAtom = atom(false);
export const desktopExternalProjectAtom = atom<ProjectSnapshot | null>(null);
export const desktopConflictOpenAtom = atom(false);
export const desktopProjectCommandsAtom = atom<ProjectCommands | null>(null);
export interface DesktopDocument {
  kind: "level" | "models" | "sprites" | "scripts";
  save: () => Promise<void>;
  discard: () => void;
  recover?: () => Promise<void>;
}
export const desktopActiveDocumentAtom = atom<DesktopDocument | null>(null);
export const desktopProjectDialogAtom = atom<"new" | "settings" | "levels" | null>(null);
export const desktopProjectActionsAtom = atom<{ open: () => Promise<void> } | null>(null);
export const desktopAssetDialogAtom = atom(false);
