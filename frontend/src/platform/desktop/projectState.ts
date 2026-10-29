import { atom } from "jotai";
import type { ProjectSnapshot } from "@pangea/desktop-contracts";
import type { PreparedEdits } from "@pangea/desktop-contracts";
import type { Result } from "neverthrow";

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
  mergeSources?: (project: ProjectSnapshot, paths: string[]) => Promise<boolean>;
  prepare?: () => Promise<Result<PreparedEdits, string>>;
  capture?: () => string;
}
export const desktopActiveDocumentAtom = atom<DesktopDocument | null>(null);
export const desktopProjectDialogAtom = atom<"new" | "settings" | "levels" | "files" | "recent" | "assignments" | "packs" | null>(null);
export const desktopProjectActionsAtom = atom<{ open: () => Promise<void> } | null>(null);
export const desktopAssetDialogAtom = atom(false);
export const desktopConsoleOpenAtom = atom(false);
