import { useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import {
  ensureScriptWorkspace, replaceScriptWorkspace, scriptWorkspaceStoreAtom,
  type ScriptWorkspaceContext, type ScriptWorkspaceState,
} from "./scriptWorkspaceState";

export type UpdateScriptWorkspace = (update: (state: ScriptWorkspaceState) => ScriptWorkspaceState) => void;

export function useScriptWorkspace(context: ScriptWorkspaceContext) {
  const [store, setStore] = useAtom(scriptWorkspaceStoreAtom);
  const workspace = useMemo(() => ensureScriptWorkspace(store, context), [store, context]);
  const update = useCallback<UpdateScriptWorkspace>((transform) => {
    setStore((current) => replaceScriptWorkspace(current, transform(ensureScriptWorkspace(current, context))));
  }, [context, setStore]);
  const persist = useCallback((state: ScriptWorkspaceState) => {
    setStore((current) => replaceScriptWorkspace(current, state));
  }, [setStore]);
  return { workspace, update, persist };
}
