import { act, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider, createStore } from "jotai";
import { afterEach, expect, it, vi } from "vitest";
import { produce } from "immer";
import type { FenceData, HeaderData, ItemData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { FenceType } from "@/data/fences/ottoFenceType";
import { SelectedItem } from "@/data/items/itemAtoms";
import { NubSnappingEnabled } from "@/data/snapping/snappingAtoms";
import { useCanvasItemThumbnail } from "./canvasItemThumbnail";
import { getFenceNubSnapTargets } from "./shared/nubSnapping";
import { FenceNub } from "./fences/FenceNub";
import { Items } from "./Items";
import { Fence } from "./fences/Fence";

vi.mock("react-konva", () => {
  function Node({ children }: { children?: ReactNode }) { return <>{children}</>; }
  return { Layer: Node, Group: Node, Rect: Node, Text: Node, Line: Node, Circle: Node, Image: Node };
});
vi.mock(import("./canvasItemThumbnail"), () => ({ useCanvasItemThumbnail: vi.fn(() => null) }));
vi.mock(import("./items/useItemLiquidTexture"), () => ({ useItemLiquidTexture: vi.fn(() => null) }));
vi.mock(import("@/data/fences/useFenceImageSource"), () => ({ useFenceImageSource: vi.fn(() => null) }));
vi.mock(import("./shared/nubSnapping"), async (original) => {
  const snapping = await original();
  return { ...snapping, getFenceNubSnapTargets: vi.fn(snapping.getFenceNubSnapTargets) };
});
vi.mock("./fences/FenceNub", () => ({ FenceNub: vi.fn(() => null) }));

const headerData: HeaderData = { Hedr: { 1000: { name: "Header", order: 0, obj: {
  version: 0, numItems: 500, mapWidth: 1, mapHeight: 1, tileSize: 32, minY: 0, maxY: 0,
  numSplines: 0, numFences: 0, numTilePages: 0, numTiles: 0, numUniqueSupertiles: 0,
  numWaterPatches: 0, numCheckpoints: 0,
} } } };
const terrainData: TerrainData = {
  alis: {}, _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
  Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
  ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
  YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 } },
};
const itemData: ItemData = { Itms: { 1000: { name: "Terrain Items List", order: 0,
  obj: Array.from({ length: 500 }, (_, index) => ({ x: index, z: index, type: 1,
    flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 })),
} } };
const setItemData = () => undefined;
const setFenceData = () => undefined;
let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function mountRoot() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const mounted = createRoot(container);
  root = mounted;
  return mounted;
}

it("renders only the moved item out of 500 and only changes selection styling for affected items", async () => {
  const mounted = mountRoot();
  const store = createStore();
  const render = (data: ItemData) => mounted.render(<Provider store={store}>
    <Items itemData={data} setItemData={setItemData} headerData={headerData} terrainData={terrainData} />
  </Provider>);
  await act(async () => render(itemData));
  expect(useCanvasItemThumbnail).toHaveBeenCalled();
  vi.mocked(useCanvasItemThumbnail).mockClear();

  const moved = produce(itemData, (draft) => { const item = draft.Itms[1000].obj[250]; if (item) item.x += 10; });
  await act(async () => render(moved));
  expect(useCanvasItemThumbnail).toHaveBeenCalledOnce();
  vi.mocked(useCanvasItemThumbnail).mockClear();
  await act(async () => store.set(SelectedItem, 250));
  expect(useCanvasItemThumbnail).toHaveBeenCalledOnce();
  vi.mocked(useCanvasItemThumbnail).mockClear();
  await act(async () => store.set(SelectedItem, 251));
  expect(useCanvasItemThumbnail).toHaveBeenCalledTimes(2);
});

it("shares one snapping scan across fence handles and retains it during drag previews", async () => {
  const mounted = mountRoot();
  const store = createStore();
  const fenceData: FenceData = {
    Fenc: { 1000: { name: "Fence List", order: 0, obj: [{ fenceType: FenceType.FARMWOOD,
      numNubs: 100, junkNubListPtr: 0, bbTop: 0, bbBottom: 0, bbLeft: 0, bbRight: 0 }] } },
    FnNb: { 1000: { name: "Fence Nub List", order: 0,
      obj: Array.from({ length: 100 }, (_, index) => [index, index]) } },
  };
  const render = (data: FenceData) => mounted.render(<Provider store={store}>
    <Fence fenceData={data} setFenceData={setFenceData} fenceIdx={0} liquidData={null} />
  </Provider>);
  await act(async () => render(fenceData));
  expect(getFenceNubSnapTargets).toHaveBeenCalledOnce();
  const firstProps: ComponentProps<typeof FenceNub> | undefined = vi.mocked(FenceNub).mock.calls[0]?.[0];
  expect(firstProps).toBeDefined();
  expect(vi.mocked(FenceNub).mock.calls.every(([props]) => props.snapTargets === firstProps?.snapTargets)).toBe(true);
  await act(async () => firstProps?.onPreviewNub(0, [10, 20]));
  expect(getFenceNubSnapTargets).toHaveBeenCalledOnce();
  const changed = produce(fenceData, (draft) => { draft.FnNb[1001] = {
    name: "Fence Nub List", order: 1, obj: [[200, 200]],
  }; });
  await act(async () => render(changed));
  expect(getFenceNubSnapTargets).toHaveBeenCalledTimes(2);
  await act(async () => store.set(NubSnappingEnabled, false));
  await act(async () => render(fenceData));
  expect(getFenceNubSnapTargets).toHaveBeenCalledTimes(2);
  await act(async () => store.set(NubSnappingEnabled, true));
  expect(getFenceNubSnapTargets).toHaveBeenCalledTimes(3);
});
