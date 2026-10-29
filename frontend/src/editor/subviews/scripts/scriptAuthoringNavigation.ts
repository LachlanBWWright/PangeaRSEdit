import { atom, useAtomValue, useSetAtom } from "jotai";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";

export type ObjectInspectorTab = "appearance" | "behavior" | "collision" | "usage";
export type ScriptsSection = "events" | "objects" | "source" | "reference" | "test";
interface AuthoringSelection {
  readonly selectedId: string | null;
  readonly tab: ObjectInspectorTab;
  readonly section: ScriptsSection;
}
const initialSelection: AuthoringSelection = { selectedId: null, tab: "appearance", section: "events" };
export const scriptAuthoringSelectionAtom = atom<Readonly<Record<string, AuthoringSelection>>>({});

export const updateScriptAuthoringSelectionAtom = atom(null, (get, set, input: {
  gameId: string;
  selection: Partial<AuthoringSelection>;
}) => {
  const selections = get(scriptAuthoringSelectionAtom);
  set(scriptAuthoringSelectionAtom, {
    ...selections,
    [input.gameId]: { ...(selections[input.gameId] ?? initialSelection), ...input.selection },
  });
});

export const openCustomObjectEditorAtom = atom(null, (_get, set, input: {
  gameId: string;
  definitionId: string;
  tab: ObjectInspectorTab;
}) => {
  set(updateScriptAuthoringSelectionAtom, {
    gameId: input.gameId,
    selection: { selectedId: input.definitionId, tab: input.tab, section: "objects" },
  });
  set(ActiveView, View.scripts);
});

export function useObjectAuthoringSelection(gameId: string) {
  const selections = useAtomValue(scriptAuthoringSelectionAtom);
  const update = useSetAtom(updateScriptAuthoringSelectionAtom);
  const selection = selections[gameId] ?? initialSelection;
  return {
    selectedId: selection.selectedId,
    tab: selection.tab,
    setSelectedId: (selectedId: string | null) => update({ gameId, selection: { selectedId } }),
    setTab: (tab: ObjectInspectorTab) => update({ gameId, selection: { tab } }),
  };
}

export function useScriptsSection(gameId: string) {
  const selections = useAtomValue(scriptAuthoringSelectionAtom);
  const update = useSetAtom(updateScriptAuthoringSelectionAtom);
  return {
    tab: (selections[gameId] ?? initialSelection).section,
    setTab: (section: ScriptsSection) => update({ gameId, selection: { section } }),
  };
}
