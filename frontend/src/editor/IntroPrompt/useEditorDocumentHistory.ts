import { useEffect, useMemo, useRef } from "react";
import { atom, useAtom, useSetAtom, useStore } from "jotai";
import type { Game } from "@/data/globals/globals";
import { BlockHistoryUpdate } from "@/data/globals/history";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { ensureScriptWorkspace, replaceScriptWorkspace, scriptWorkspaceStoreAtom, type ScriptWorkspaceContext, type ScriptWorkspaceState } from "../subviews/scripts/scriptWorkspaceState";
import { moveEditorHistory, recordEditorHistory, restoreScriptAuthoring, type EditorHistory } from "./editorHistory";

interface HistoryInput {
  readonly data: AtomicLevelData;
  readonly setData: (data: AtomicLevelData) => void;
  readonly workspace: ScriptWorkspaceState;
  readonly context: ScriptWorkspaceContext;
  readonly file: File | undefined;
  readonly game: Game;
  readonly level: number;
}

export function useEditorDocumentHistory(input: HistoryInput) {
  const historyAtom = useMemo(() => atom<EditorHistory>({ items: [], index: 0 }), []);
  const atomStore = useStore();
  const [dataHistory, setHistory] = useAtom(historyAtom);
  const previousContext = useRef<{ file: File | undefined; game: Game; level: number } | null>(null);
  const [blocked, setBlocked] = useAtom(BlockHistoryUpdate);
  const setScripts = useSetAtom(scriptWorkspaceStoreAtom);
  const { data, workspace, file, game, level } = input;

  useEffect(() => {
    const previous = previousContext.current;
    const changed = !previous || previous.file !== file || previous.game !== game || previous.level !== level;
    previousContext.current = { file, game, level };
    const item = { ...data, scripts: workspace };
    if (!data.headerData || changed) {
      setHistory({ items: data.headerData ? [item] : [], index: 0 });
      if (blocked) setBlocked(false);
      return;
    }
    if (blocked) {
      setBlocked(false);
      return;
    }
    setHistory((history) => recordEditorHistory(history, item));
  }, [data, workspace, file, game, level, blocked, setBlocked, setHistory]);

  function move(direction: -1 | 1) {
    const target = moveEditorHistory(atomStore.get(historyAtom), direction);
    if (!target) return;
    setHistory(target.history);
    input.setData(target.item);
    setScripts((store) => replaceScriptWorkspace(store, restoreScriptAuthoring(ensureScriptWorkspace(store, input.context), target.item.scripts)));
    setBlocked(true);
  }

  return { dataHistory, undoData: () => move(-1), redoData: () => move(1) };
}
