import { useAtom } from "jotai";
import { atomWithReducer } from "jotai/utils";
import { engineWorkspaceReducer, initialEngineWorkspace } from "./engineWorkspaceState";

export const engineWorkspaceAtom = atomWithReducer(initialEngineWorkspace(), engineWorkspaceReducer);
export function useEngineWorkspace() { return useAtom(engineWorkspaceAtom); }
