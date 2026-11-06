import { useEffect, useState } from "react";
import { Provider, createStore } from "jotai";
import { useImmer } from "use-immer";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { OttoGlobals, Globals } from "@/data/globals/globals";
import { LevelNumber } from "@/data/globals/levelNumber";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { openFile } from "@/editor/loadLogic/openFile";
import { OttoMaticKonvaView } from "@/editor/canvas/OttoMaticKonvaView";
import { View } from "@/editor/viewEnum";
import { ItemMenu } from "./ItemMenu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getFeatureFlags, setFeatureFlags } from "@/config/featureFlags";
import { createScriptWorkspaceContext, ensureScriptWorkspace, loadScriptSample, replaceScriptWorkspace, scriptWorkspaceStoreAtom } from "../scripts/scriptWorkspaceState";
import { CustomObjectToPlaceAtom, SelectedCustomPlacementAtom } from "../scripts/scriptPlacementSelectionState";
import { ClickToAddItem } from "@/data/items/itemAtoms";
import type { HeaderData, ItemData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CustomObjectsPage } from "@/pages/CustomObjectsPage";
import { desktopLevelIdAtom, desktopProjectAtom } from "@/platform/desktop/projectState";
import { workflowProject } from "@/platform/desktop/workflowFixtures.stories.support";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { EmptyItemPrompt } from "../EmptyDataPrompts";
import { createEmptyItemData } from "@/editor/utils/dataInitializers";
import Konva from "konva";
import { scriptAuthoringSelectionAtom } from "../scripts/scriptAuthoringNavigation";

const context = createScriptWorkspaceContext(OttoGlobals, 0);
let storyStore = createStore();

function LoadedPlacementEditor({ headerData, terrainData, itemData, images }: { headerData: HeaderData; terrainData: TerrainData; itemData: ItemData | null; images: HTMLCanvasElement[] }) {
  const [header] = useState(headerData);
  const [terrain, setTerrain] = useImmer(terrainData);
  const [items, setItems] = useImmer<ItemData | null>(itemData);
  const [stage, setStage] = useImmer({ x: 0, y: 0, scale: 0.4 });
  return <div className="grid h-[680px] grid-cols-[280px_1fr] bg-slate-950 text-white">
    <aside className="overflow-y-auto border-r border-slate-700 py-3">
      {items ? <ItemMenu itemData={items} setItemData={(update) => setItems((current) => current ? (typeof update === "function" ? update(current) : update) : current)} headerData={header} /> : <EmptyItemPrompt onInitialize={() => setItems(createEmptyItemData())} />}
    </aside>
    <OttoMaticKonvaView headerData={header} terrainData={terrain} setTerrainData={setTerrain} itemData={items} setItemData={setItems}
      liquidData={null} setLiquidData={() => undefined} fenceData={null} setFenceData={() => undefined} splineData={null} setSplineData={() => undefined}
      mapImages={images} view={View.items} stage={stage} setStage={setStage} onResize={async () => undefined} />
  </div>;
}

function PlacementEditorStory({ startInLibrary = false, withoutNativeItems = false }: { startInLibrary?: boolean; withoutNativeItems?: boolean }) {
  const [level, setLevel] = useState<AtomicLevelData | null>(null);
  const [images, setImages] = useState<HTMLCanvasElement[]>([]);
  useEffect(() => {
    void openFile({ url: "/assets/ottoMatic/terrain/EarthFarm.ter", gameType: OttoGlobals,
      setGlobals: (globals) => storyStore.set(Globals, globals), setMapFile: () => undefined,
      setMapImagesFile: () => undefined, setMapImages: setImages, setData: setLevel });
  }, []);
  if (!level?.headerData || !level.terrainData || !level.itemData || images.length === 0) return <p>Loading Earth Farm…</p>;
  return <Provider store={storyStore}><TooltipProvider><MemoryRouter initialEntries={[startInLibrary ? "/custom-objects" : "/"]}><Routes>
    <Route path="/custom-objects" element={<CustomObjectsPage />} />
    <Route path="/" element={<LoadedPlacementEditor headerData={level.headerData} terrainData={level.terrainData} itemData={withoutNativeItems ? null : level.itemData} images={images} />} />
  </Routes></MemoryRouter></TooltipProvider></Provider>;
}

function placements() {
  return ensureScriptWorkspace(storyStore.get(scriptWorkspaceStoreAtom), context).levels[context.levelKey]?.customPlacements ?? [];
}

const meta = {
  title: "Editor/Custom item placement",
  component: PlacementEditorStory,
  parameters: { layout: "fullscreen" },
  tags: ["test", "interaction"],
  beforeEach: () => {
    setFeatureFlags({ ...getFeatureFlags(), scripting: true });
    storyStore = createStore();
    storyStore.set(Globals, OttoGlobals);
    storyStore.set(LevelNumber, 0);
    const sample = loadScriptSample(context, "hover-beacon");
    const currentLevel = sample.levels[context.levelKey];
    if (!currentLevel) return;
    storyStore.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, {
      ...sample, levels: { ...sample.levels, [context.levelKey]: { ...currentLevel, customPlacements: [] } },
    }));
  },
} satisfies Meta<typeof PlacementEditorStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SwitchItemKinds: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const picker = await canvas.findByRole("combobox", { name: "Item" }, { timeout: 30000 });
    await userEvent.click(picker);
    const nativeOption = within(document.body).getAllByRole("option")[0];
    if (!nativeOption) return;
    await userEvent.click(nativeOption);
    expect(storyStore.get(ClickToAddItem)).toBeDefined();
    expect(storyStore.get(CustomObjectToPlaceAtom)).toBeNull();
    await userEvent.click(picker);
    await userEvent.click(within(document.body).getByRole("option", { name: /Hover Beacon/i }));
    expect(storyStore.get(ClickToAddItem)).toBeUndefined();
    expect(storyStore.get(CustomObjectToPlaceAtom)).toBe("sample.hoverBeacon");
    await userEvent.click(picker);
    const nextNativeOption = within(document.body).getAllByRole("option")[0];
    if (!nextNativeOption) return;
    await userEvent.click(nextNativeOption);
    expect(storyStore.get(ClickToAddItem)).toBeDefined();
    expect(storyStore.get(CustomObjectToPlaceAtom)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Stop Adding Items" }));
    expect(storyStore.get(ClickToAddItem)).toBeUndefined();
    expect(storyStore.get(CustomObjectToPlaceAtom)).toBeNull();
    expect(canvas.getAllByRole("combobox")).toHaveLength(1);
  },
};

export const PlaceSelectEditDelete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Item" })).toBeVisible(), { timeout: 30000 });
    await userEvent.click(canvas.getByRole("combobox", { name: "Item" }));
    await userEvent.click(within(document.body).getByRole("option", { name: /Hover Beacon/i }));
    expect(storyStore.get(ClickToAddItem)).toBeUndefined();
    const mapCanvas = canvasElement.querySelector("canvas");
    expect(mapCanvas).not.toBeNull();
    if (!mapCanvas) return;
    const bounds = mapCanvas.getBoundingClientRect();
    await userEvent.pointer({ target: mapCanvas, coords: { clientX: bounds.left + 120, clientY: bounds.top + 120 }, keys: "[MouseLeft]" });
    await waitFor(() => expect(placements()).toHaveLength(1));
    await userEvent.pointer({ target: mapCanvas, coords: { clientX: bounds.left + 180, clientY: bounds.top + 120 }, keys: "[MouseLeft]" });
    await waitFor(() => expect(placements()).toHaveLength(2));
    await userEvent.click(canvas.getByRole("button", { name: "Stop Adding Items" }));
    await userEvent.pointer({ target: mapCanvas, coords: { clientX: bounds.left + 120, clientY: bounds.top + 120 }, keys: "[MouseLeft]" });
    await waitFor(() => expect(storyStore.get(SelectedCustomPlacementAtom)).toBe(placements()[0]?.id));
    const x = canvas.getByRole("spinbutton", { name: "X" });
    await userEvent.clear(x);
    await userEvent.type(x, "400");
    expect(placements()[0]?.position.x).toBe(400);
    await userEvent.click(canvas.getByRole("combobox", { name: "Activation" }));
    await userEvent.click(within(document.body).getByRole("option", { name: "Near a player" }));
    const radius = canvas.getByRole("spinbutton", { name: "Activation radius (world units)" });
    await userEvent.clear(radius);
    await userEvent.type(radius, "4500");
    await userEvent.tab();
    expect(placements()[0]?.activation).toEqual({ kind: "near-player", radius: 4500 });
    expect(placements()[1]?.activation).toBeUndefined();
    await userEvent.click(canvas.getByRole("button", { name: "Delete Item" }));
    await waitFor(() => expect(placements()).toHaveLength(1));
    expect(storyStore.get(SelectedCustomPlacementAtom)).toBeNull();
  },
};

export const DragLikeNativeItems: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Item" })).toBeVisible(), { timeout: 30000 });
    await userEvent.click(canvas.getByRole("combobox", { name: "Item" }));
    await userEvent.click(within(document.body).getByRole("option", { name: /Hover Beacon/i }));
    const mapCanvas = canvasElement.querySelector("canvas");
    expect(mapCanvas).not.toBeNull();
    if (!mapCanvas) return;
    const bounds = mapCanvas.getBoundingClientRect();
    const start = { clientX: bounds.left + 120, clientY: bounds.top + 120 };
    await userEvent.pointer({ target: mapCanvas, coords: start, keys: "[MouseLeft]" });
    await waitFor(() => expect(placements()).toHaveLength(1));
    const before = placements()[0];
    if (!before) return;
    await userEvent.click(canvas.getByRole("button", { name: "Stop Adding Items" }));
    const stage = Konva.stages.find((candidate) => canvasElement.contains(candidate.container()));
    expect(stage).toBeDefined();
    await userEvent.pointer([
      { target: mapCanvas, coords: start, keys: "[MouseLeft>]" },
      { target: mapCanvas, coords: { clientX: start.clientX + 4, clientY: start.clientY + 4 } },
      { target: mapCanvas, coords: { clientX: start.clientX + 40, clientY: start.clientY + 24 } },
      { target: mapCanvas, coords: { clientX: start.clientX + 40, clientY: start.clientY + 24 }, keys: "[/MouseLeft]" },
    ]);
    await waitFor(() => {
      expect(placements()[0]?.position.x).toBe(before.position.x + 100);
      expect(placements()[0]?.position.z).toBe(before.position.z + 60);
    });
    expect(placements()).toHaveLength(1);
    expect(storyStore.get(SelectedCustomPlacementAtom)).toBe(before.id);
  },
};

export const PlaceFromObjectLibrary: Story = {
  args: { startInLibrary: true },
  beforeEach: () => {
    storyStore.set(desktopProjectAtom, workflowProject);
    storyStore.set(desktopLevelIdAtom, "farm");
    storyStore.set(ActiveView, View.scripts);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("button", { name: "Place in level" })).toBeVisible(), { timeout: 30000 });
    await userEvent.click(canvas.getByRole("button", { name: "Place in level" }));
    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Item" })).toBeVisible());
    expect(storyStore.get(ActiveView)).toBe(View.items);
    expect(canvas.getByRole("combobox", { name: "Item" })).toHaveTextContent("Hover Beacon");
    const mapCanvas = canvasElement.querySelector("canvas");
    expect(mapCanvas).not.toBeNull();
    if (!mapCanvas) return;
    const bounds = mapCanvas.getBoundingClientRect();
    await userEvent.pointer({ target: mapCanvas, coords: { clientX: bounds.left + 120, clientY: bounds.top + 120 }, keys: "[MouseLeft]" });
    await waitFor(() => expect(placements()).toHaveLength(1));
    expect(placements()[0]?.objectId).toBe("sample.hoverBeacon");
  },
};

export const PlaceWithoutNativeItemList: Story = {
  args: { withoutNativeItems: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("button", { name: "Add Item List" })).toBeVisible(), { timeout: 30000 });
    await userEvent.click(canvas.getByRole("combobox", { name: "Item" }));
    await userEvent.click(within(document.body).getByRole("option", { name: /Hover Beacon/i }));
    expect(canvas.queryByRole("button", { name: "Add Item List" })).toBeNull();
    const mapCanvas = canvasElement.querySelector("canvas");
    expect(mapCanvas).not.toBeNull();
    if (!mapCanvas) return;
    const bounds = mapCanvas.getBoundingClientRect();
    await userEvent.pointer({ target: mapCanvas, coords: { clientX: bounds.left + 120, clientY: bounds.top + 120 }, keys: "[MouseLeft]" });
    await waitFor(() => expect(placements()).toHaveLength(1));
    await userEvent.click(canvas.getByRole("button", { name: "Stop Adding Items" }));
    expect(canvas.getByRole("button", { name: "Add Item List" })).toBeVisible();
  },
};

export const SelectedPlacementAuthoringActions: Story = {
  beforeEach: () => {
    const sample = loadScriptSample(context, "hover-beacon");
    storyStore.set(scriptWorkspaceStoreAtom, replaceScriptWorkspace({}, sample));
    storyStore.set(SelectedCustomPlacementAtom, sample.levels[context.levelKey]?.customPlacements[0]?.id ?? null);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("button", { name: "Edit definition" })).toBeVisible(), { timeout: 30000 });
    for (const [label, tab] of [["Edit definition", "appearance"], ["Edit behavior", "behavior"], ["Find instances", "usage"]] satisfies readonly (readonly [string, string])[]) {
      await userEvent.click(canvas.getByRole("button", { name: label }));
      expect(storyStore.get(ActiveView)).toBe(View.scripts);
      expect(storyStore.get(scriptAuthoringSelectionAtom)[context.gameId]).toEqual({ selectedId: "sample.hoverBeacon", tab, section: "objects" });
    }
  },
};
