import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import {
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  placeCustomObject,
  replaceScriptWorkspace,
  scriptWorkspaceStoreAtom,
} from "./scriptWorkspaceState";
import { CustomObjectToPlaceAtom } from "./scriptPlacementSelectionState";
import { sampleItemTerrainHeight } from "../items/itemTerrainHeight";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";

interface CustomObjectPlacementMode {
  readonly objectId: string | null;
  readonly placeAt: (x: number, z: number) => boolean;
}

export function useCustomObjectPlacement(headerData: HeaderData, terrainData: TerrainData): CustomObjectPlacementMode {
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const objectId = useAtomValue(CustomObjectToPlaceAtom);
  const setWorkspaceStore = useSetAtom(scriptWorkspaceStoreAtom);

  const placeAt = useCallback(
    (x: number, z: number) => {
      if (!ENABLE_SCRIPTS || objectId === null) {
        return false;
      }

      const context = createScriptWorkspaceContext(globals, levelNumber ?? null);
      let didPlace = false;
      setWorkspaceStore((store) => {
        const workspace = ensureScriptWorkspace(store, context);
        const definition = workspace.customObjects.find(
          (candidate) => candidate.id === objectId,
        );
        if (!definition) {
          return store;
        }
        didPlace = true;
        return replaceScriptWorkspace(
          store,
          placeCustomObject(workspace, objectId, definition.label, {
            x, y: sampleItemTerrainHeight(x, z, headerData, terrainData, globals), z,
          }),
        );
      });
      return didPlace;
    },
    [globals, levelNumber, objectId, setWorkspaceStore, headerData, terrainData],
  );

  return {
    objectId: ENABLE_SCRIPTS ? objectId : null,
    placeAt,
  };
}

export function useStopCustomObjectPlacement(): () => void {
  const setObjectId = useSetAtom(CustomObjectToPlaceAtom);
  return useCallback(() => setObjectId(null), [setObjectId]);
}
