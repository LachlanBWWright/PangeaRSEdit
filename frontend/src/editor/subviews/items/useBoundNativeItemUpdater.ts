import { useStore } from "jotai";
import { produce, type Draft } from "immer";
import { toast } from "sonner";
import type { Updater } from "use-immer";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import type { ItemData } from "@/python/structSpecs/LevelTypes";
import { createScriptWorkspaceContext, ensureScriptWorkspace, replaceScriptWorkspace, scriptWorkspaceStoreAtom } from "../scripts/scriptWorkspaceState";
import { updateNativeItemBindingsAfterEdit } from "../scripts/scriptNativeItemEdits";

export function useBoundNativeItemUpdater(data: ItemData, setData: Updater<ItemData>) {
  const store = useStore();
  return (edit: (draft: Draft<ItemData>) => void) => {
    const next = produce(data, edit);
    if (next === data) return;
    const before = data.Itms[1000].obj;
    const after = next.Itms[1000].obj;
    const mapping = before.flatMap((item, index) => {
      const retained = after.indexOf(item);
      const newIndex = retained >= 0 ? retained : before.length === after.length ? index : -1;
      return newIndex < 0 ? [] : [{oldIndex: index, newIndex}];
    });
    const context = createScriptWorkspaceContext(store.get(Globals), store.get(LevelNumber) ?? null);
    const current = store.get(scriptWorkspaceStoreAtom);
    const result = updateNativeItemBindingsAfterEdit(ensureScriptWorkspace(current, context), before, after, mapping);
    if (result.isErr()) {toast.error(result.error); return;}
    setData(next);
    store.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace(current, result.value));
  };
}
