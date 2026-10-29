import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Layer } from "react-konva";
import { memo, useCallback, useEffect } from "react";
import { Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { createScriptWorkspaceContext, ensureScriptWorkspace, moveCustomPlacement, removeCustomPlacement, replaceScriptWorkspace, scriptWorkspaceStoreAtom } from "./scripts/scriptWorkspaceState";
import { SelectedCustomPlacementAtom } from "./scripts/scriptPlacementSelectionState";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { ActiveHoverTag } from "@/data/globals/hoverTagAtom";
import { CustomPlacementNode } from "./items/CustomPlacementNode";
import { sampleItemTerrainHeight } from "./items/itemTerrainHeight";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { ScriptCustomObjectPlacement } from "./scripts/scriptWorkspaceState";
import { getMetadataResource } from "./metadata/metadataResource";

const emptyPlacements: readonly ScriptCustomObjectPlacement[] = [];

export const CustomScriptPlacements = memo(function CustomScriptPlacements({ headerData, terrainData }: { headerData: HeaderData; terrainData: TerrainData }) {
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const [workspaceStore, setWorkspaceStore] = useAtom(scriptWorkspaceStoreAtom);
  const [selectedId, setSelectedId] = useAtom(SelectedCustomPlacementAtom);
  const setHover = useSetAtom(ActiveHoverTag);
  const context = createScriptWorkspaceContext(globals, levelNumber ?? null);
  const workspace = ensureScriptWorkspace(workspaceStore, context);
  const placements = workspace.levels[context.levelKey]?.customPlacements ?? emptyPlacements;

  const move = useCallback((id: string, x: number, z: number) => {
    setWorkspaceStore((store) => {
      const current = ensureScriptWorkspace(store, context);
      const original = current.levels[context.levelKey]?.customPlacements.find((item) => item.id === id);
      if (!original) return store;
      const previousGround = sampleItemTerrainHeight(original.position.x, original.position.z, headerData, terrainData, globals);
      const nextGround = sampleItemTerrainHeight(x, z, headerData, terrainData, globals);
      return replaceScriptWorkspace(store, moveCustomPlacement(current, id, { x, y: nextGround + original.position.y - previousGround, z }));
    });
  }, [context, headerData, terrainData, globals, setWorkspaceStore]);

  useEffect(() => () => setHover(null), [setHover]);
  useEffect(() => {
    if (selectedId !== null && !placements.some((placement) => placement.id === selectedId)) setSelectedId(null);
  }, [placements, selectedId, setSelectedId]);
  useWindowKeyDown(useCallback((event) => {
    if (!ENABLE_SCRIPTS || selectedId === null || (event.key !== "Delete" && event.key !== "Backspace")) return;
    // Keyboard edits in inspector controls belong to the control, not the map.
    if (document.activeElement?.closest("input, textarea, select, [contenteditable=true], [role=combobox]")) return;
    event.preventDefault();
    setWorkspaceStore((store) => replaceScriptWorkspace(store, removeCustomPlacement(ensureScriptWorkspace(store, context), selectedId)));
    setSelectedId(null);
  }, [context, selectedId, setSelectedId, setWorkspaceStore]));

  if (!ENABLE_SCRIPTS || placements.length === 0) return null;
  const metadata = getMetadataResource(terrainData, globals.GAME_TYPE)?.properties;
  return <Layer>{placements.map((placement) => <CustomPlacementNode key={placement.id} placement={placement} definition={workspace.customObjects.find((definition) => definition.id === placement.objectId)} assets={workspace.assets} metadata={metadata} selected={selectedId === placement.id} onSelect={setSelectedId} onMove={move} onHover={setHover} />)}</Layer>;
});
