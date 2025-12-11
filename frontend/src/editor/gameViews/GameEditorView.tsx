/**
 * Game Editor View Selector
 * 
 * Selects and renders the appropriate EditorView component based on game type.
 * Each game gets explicitly typed props tailored to its features.
 */

import { useAtomValue } from "jotai";
import { Game, Globals } from "@/data/globals/globals";
import type { EditorViewProps } from "../utils/editorViewTypes";
import { OttoMaticEditorView } from "./OttoMaticEditorView";
import { StandardEditorView } from "./StandardEditorView";
import { BugdomEditorView } from "./BugdomEditorView";
import { NanosaurEditorView } from "./NanosaurEditorView";
import { MightyMikeEditorView } from "./MightyMikeEditorView";

/**
 * Renders the appropriate game-specific EditorView based on current game type
 * Props are explicitly passed to each component, not spread
 */
export function GameEditorView(props: EditorViewProps) {
  const globals = useAtomValue(Globals);

  // Extract base props common to all views
  const {
    headerData,
    setHeaderData,
    terrainData,
    setTerrainData,
    mapImages,
    setMapImages,
    undoData,
    redoData,
    dataHistory,
    itemData,
    setItemData,
    liquidData,
    setLiquidData,
    fenceData,
    setFenceData,
    splineData,
    setSplineData,
  } = props;

  // Base props shared by all views
  const baseProps = {
    headerData,
    setHeaderData,
    terrainData,
    setTerrainData,
    mapImages,
    setMapImages,
    undoData,
    redoData,
    dataHistory,
  };

  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      // Otto Matic requires all data types - use defaults if null
      return (
        <OttoMaticEditorView
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
          setTerrainData={setTerrainData}
          mapImages={mapImages}
          setMapImages={setMapImages}
          undoData={undoData}
          redoData={redoData}
          dataHistory={dataHistory}
          itemData={itemData}
          setItemData={setItemData}
          liquidData={liquidData}
          setLiquidData={setLiquidData}
          fenceData={fenceData}
          setFenceData={setFenceData}
          splineData={splineData}
          setSplineData={setSplineData}
        />
      );

    case Game.BUGDOM:
      // Bugdom: items, fences, splines (no water)
      return (
        <BugdomEditorView
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
          setTerrainData={setTerrainData}
          mapImages={mapImages}
          setMapImages={setMapImages}
          undoData={undoData}
          redoData={redoData}
          dataHistory={dataHistory}
          itemData={itemData}
          setItemData={setItemData}
          fenceData={fenceData}
          setFenceData={setFenceData}
          splineData={splineData}
          setSplineData={setSplineData}
        />
      );

    case Game.NANOSAUR:
      // Nanosaur: items only (no fences, water, or splines)
      return (
        <NanosaurEditorView
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
          setTerrainData={setTerrainData}
          mapImages={mapImages}
          setMapImages={setMapImages}
          undoData={undoData}
          redoData={redoData}
          dataHistory={dataHistory}
          itemData={itemData}
          setItemData={setItemData}
        />
      );

    case Game.MIGHTY_MIKE:
      // Mighty Mike: items and terrain only
      return (
        <MightyMikeEditorView
          {...baseProps}
          itemData={itemData}
          setItemData={setItemData}
        />
      );

    // Standard games use StandardEditorView
    case Game.BUGDOM_2:
    case Game.NANOSAUR_2:
    case Game.CRO_MAG:
    case Game.BILLY_FRONTIER:
      return (
        <StandardEditorView
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
          setTerrainData={setTerrainData}
          mapImages={mapImages}
          setMapImages={setMapImages}
          undoData={undoData}
          redoData={redoData}
          dataHistory={dataHistory}
          itemData={itemData}
          setItemData={setItemData}
          liquidData={liquidData}
          setLiquidData={setLiquidData}
          fenceData={fenceData}
          setFenceData={setFenceData}
          splineData={splineData}
          setSplineData={setSplineData}
        />
      );

    default:
      // Fallback to standard view
      return (
        <StandardEditorView
          headerData={headerData}
          setHeaderData={setHeaderData}
          terrainData={terrainData}
          setTerrainData={setTerrainData}
          mapImages={mapImages}
          setMapImages={setMapImages}
          undoData={undoData}
          redoData={redoData}
          dataHistory={dataHistory}
          itemData={itemData}
          setItemData={setItemData}
          liquidData={liquidData}
          setLiquidData={setLiquidData}
          fenceData={fenceData}
          setFenceData={setFenceData}
          splineData={splineData}
          setSplineData={setSplineData}
        />
      );
  }
}
