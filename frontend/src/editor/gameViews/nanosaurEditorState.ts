import type { GlobalsInterface } from "@/data/globals/globals";
import type {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { resizeEditorAtomicSupertiles } from "@/editor/gameViews/editorResizeState";
import type { Updater } from "use-immer";

interface ResizeNanosaurArgs {
  readonly headerData: HeaderData;
  readonly itemData: ItemData | null;
  readonly terrainData: TerrainData;
  readonly globals: GlobalsInterface;
  readonly setHeaderData: Updater<HeaderData>;
  readonly setItemData: (next: ItemData | null) => void;
  readonly setTerrainData: Updater<TerrainData>;
  readonly direction: "top" | "bottom" | "left" | "right";
  readonly supertileCount: number;
}

export function resizeNanosaurSupertiles({
  headerData,
  itemData,
  terrainData,
  globals,
  setHeaderData,
  setItemData,
  setTerrainData,
  direction,
  supertileCount,
}: ResizeNanosaurArgs): void {
  resizeEditorAtomicSupertiles({
    headerData,
    itemData,
    liquidData: null,
    fenceData: null,
    splineData: null,
    terrainData,
    globals,
    direction,
    supertileCount,
    defaultHeight: headerData.Hedr[1000].obj.minY ?? 0,
    setHeaderData,
    setItemData,
    setLiquidData: () => {
      // Nanosaur 2 doesn't have liquid data
    },
    setFenceData: () => {
      // Nanosaur 2 doesn't have fence data
    },
    setSplineData: () => {
      // Nanosaur 2 doesn't have spline data
    },
    setTerrainData,
  });
}
