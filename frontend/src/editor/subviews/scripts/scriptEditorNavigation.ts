import { atom } from "jotai";

export interface ScriptEditorNavigation {
  readonly gameId: string;
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly sequence: number;
}
export const scriptEditorNavigationAtom = atom<ScriptEditorNavigation | null>(null);
