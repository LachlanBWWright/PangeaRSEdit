import { Fences } from "../subviews/Fences";
import { Items } from "../subviews/Items";
import { Splines } from "../subviews/Splines";
import { Supertiles } from "../subviews/Supertiles";
import { Tiles } from "../subviews/Tiles";
import { WaterBodies } from "../subviews/WaterBodies";
import { AccessibilityMaskOverlay } from "../subviews/AccessibilityMaskOverlay";
import { Updater } from "use-immer";
import {
  FenceData,
  HeaderData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import {
  shouldRenderAccessibilityOverlay,
  shouldRenderFences,
  shouldRenderItems,
  shouldRenderSplines,
  shouldRenderSupertiles,
  shouldRenderTileEditor,
  shouldRenderWater,
  shouldRenderWorldLayersInSupertilesView,
} from "@/editor/canvas/canvasStageLayerState";

export enum CanvasViewMode {
  fences,
  water,
  items,
  splines,
  tiles,
  supertiles,
}

interface CanvasStageLayersProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  itemData: ItemData | null;
  setItemData: Updater<ItemData>;
  liquidData: LiquidData | null;
  setLiquidData: Updater<LiquidData>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData>;
  mapImages: HTMLCanvasElement[];
  view: CanvasViewMode;
}

export function CanvasStageLayers({
  headerData,
  terrainData,
  setTerrainData,
  itemData,
  setItemData,
  liquidData,
  setLiquidData,
  fenceData,
  setFenceData,
  splineData,
  setSplineData,
  mapImages,
  view,
}: CanvasStageLayersProps) {
  return (
    <>
      {terrainData &&
        shouldRenderSupertiles(
          Boolean(terrainData.STgd),
          Boolean(terrainData.Layr),
        ) && (
          <Supertiles
            headerData={headerData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}
      {shouldRenderAccessibilityOverlay(view) && (
        <AccessibilityMaskOverlay
          headerData={headerData}
          terrainData={terrainData}
        />
      )}
      {shouldRenderTileEditor(view) && (
        <Tiles
          headerData={headerData}
          terrainData={terrainData}
          setTerrainData={setTerrainData}
          isEditingTopology
        />
      )}
      {shouldRenderWorldLayersInSupertilesView(view) && (
        <>
          {liquidData && shouldRenderWater(view) && (
            <WaterBodies
              headerData={headerData}
              terrainData={terrainData}
              liquidData={liquidData}
              setLiquidData={setLiquidData}
            />
          )}
          {fenceData && shouldRenderFences(view) && (
            <Fences fenceData={fenceData} setFenceData={setFenceData} />
          )}
          {itemData && shouldRenderItems(view) && (
            <Items
              headerData={headerData}
              terrainData={terrainData}
              itemData={itemData}
              setItemData={setItemData}
            />
          )}
          {splineData && shouldRenderSplines(view) && (
            <Splines splineData={splineData} setSplineData={setSplineData} />
          )}
        </>
      )}
      {view === CanvasViewMode.fences && (
        <>
          {liquidData && (
            <WaterBodies
              headerData={headerData}
              terrainData={terrainData}
              liquidData={liquidData}
              setLiquidData={setLiquidData}
            />
          )}
          {itemData && (
            <Items
              headerData={headerData}
              terrainData={terrainData}
              itemData={itemData}
              setItemData={setItemData}
            />
          )}
          {splineData && (
            <Splines splineData={splineData} setSplineData={setSplineData} />
          )}
          {fenceData && (
            <Fences fenceData={fenceData} setFenceData={setFenceData} />
          )}
        </>
      )}
      {view === CanvasViewMode.water && (
        <>
          {fenceData && (
            <Fences fenceData={fenceData} setFenceData={setFenceData} />
          )}
          {itemData && (
            <Items
              headerData={headerData}
              terrainData={terrainData}
              itemData={itemData}
              setItemData={setItemData}
            />
          )}
          {splineData && (
            <Splines splineData={splineData} setSplineData={setSplineData} />
          )}
          {liquidData && (
            <WaterBodies
              headerData={headerData}
              terrainData={terrainData}
              liquidData={liquidData}
              setLiquidData={setLiquidData}
            />
          )}
        </>
      )}
      {view === CanvasViewMode.splines && (
        <>
          {liquidData && (
            <WaterBodies
              headerData={headerData}
              terrainData={terrainData}
              liquidData={liquidData}
              setLiquidData={setLiquidData}
            />
          )}
          {itemData && (
            <Items
              headerData={headerData}
              terrainData={terrainData}
              itemData={itemData}
              setItemData={setItemData}
            />
          )}
          {fenceData && (
            <Fences fenceData={fenceData} setFenceData={setFenceData} />
          )}
          {splineData && (
            <Splines splineData={splineData} setSplineData={setSplineData} />
          )}
        </>
      )}
      {view === CanvasViewMode.items && (
        <>
          {liquidData && (
            <WaterBodies
              headerData={headerData}
              terrainData={terrainData}
              liquidData={liquidData}
              setLiquidData={setLiquidData}
            />
          )}
          {splineData && (
            <Splines splineData={splineData} setSplineData={setSplineData} />
          )}
          {fenceData && (
            <Fences fenceData={fenceData} setFenceData={setFenceData} />
          )}
          {itemData && (
            <Items
              headerData={headerData}
              terrainData={terrainData}
              itemData={itemData}
              setItemData={setItemData}
            />
          )}
        </>
      )}
    </>
  );
}
