import { useState } from "react";
import { Provider, createStore } from "jotai";
import { useImmer } from "use-immer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Globals, OttoGlobals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { OttoMaticEditorView } from "@/editor/gameViews/OttoMaticEditorView";
import { StandardEditorToolbar } from "@/editor/toolbars/StandardEditorToolbar";
import { View } from "@/editor/viewEnum";
import { replaceScriptWorkspace, scriptWorkspaceStoreAtom } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { scriptAuthoringSelectionAtom } from "@/editor/subviews/scripts/scriptAuthoringNavigation";
import { SelectedCustomPlacementAtom } from "@/editor/subviews/scripts/scriptPlacementSelectionState";
import { enableStoryScripting } from "./actualEditorMenuStory";
import type { BrainPortWorkflowFixture } from "./brainPortWorkflowFixture";

export type BrainPortStep = "create" | "appearance" | "behavior" | "placement" | "export";
type LoadedFixture = Extract<BrainPortWorkflowFixture, { value: unknown }>["value"];

function WorkflowEditor({ fixture, step }: { fixture: LoadedFixture; step: BrainPortStep }) {
  const [headerData, setHeaderData] = useImmer(fixture.level.headerData);
  const [terrainData, setTerrainData] = useImmer(fixture.level.terrainData);
  const [itemData, setItemData] = useImmer(fixture.level.itemData);
  const [liquidData, setLiquidData] = useImmer(fixture.level.liquidData);
  const [fenceData, setFenceData] = useImmer(fixture.level.fenceData);
  const [splineData, setSplineData] = useImmer(fixture.level.splineData);
  const [mapImages, setMapImages] = useState(fixture.images);
  const [store] = useState(() => {
    enableStoryScripting();
    const next = createStore();
    next.set(Globals, OttoGlobals);
    next.set(LevelNumber, 0);
    next.set(CanvasViewMode, CanvasView.TWO_D);
    next.set(ActiveView, step === "placement" ? View.items : View.scripts);
    const workspace = step === "create" ? { ...fixture.workspace, customObjects: [], levels: {} } : fixture.workspace;
    next.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, workspace));
    next.set(scriptAuthoringSelectionAtom, { [workspace.context.gameId]: {
      selectedId: workspace.customObjects[0]?.id ?? null,
      tab: step === "behavior" ? "behavior" : "appearance", section: step === "export" ? "test" : "objects",
    } });
    if (step === "placement") next.set(SelectedCustomPlacementAtom, workspace.levels[workspace.context.levelKey]?.customPlacements[0]?.id ?? null);
    return next;
  });
  return <Provider store={store}><TooltipProvider>
    <main className="h-screen flex flex-col bg-gray-900 text-white">
      <nav aria-label="Level editor" className="border-b border-gray-700 p-2"><StandardEditorToolbar compact terrainHasSTgd /></nav>
      <OttoMaticEditorView headerData={headerData} setHeaderData={setHeaderData} terrainData={terrainData} setTerrainData={setTerrainData}
        itemData={itemData} setItemData={setItemData} liquidData={liquidData} setLiquidData={setLiquidData} fenceData={fenceData} setFenceData={setFenceData}
        splineData={splineData} setSplineData={setSplineData} mapImages={mapImages} setMapImages={setMapImages}
        undoData={() => undefined} redoData={() => undefined} dataHistory={{ items: [], index: 0 }} />
    </main>
  </TooltipProvider></Provider>;
}

export function BrainPortWorkflowStory({ fixture, step }: { fixture: BrainPortWorkflowFixture; step: BrainPortStep }) {
  return fixture.isErr() ? <p role="alert">{fixture.error}</p> : <WorkflowEditor key={step} fixture={fixture.value} step={step} />;
}
