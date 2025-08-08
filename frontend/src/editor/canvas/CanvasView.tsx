import { SelectedFence } from "@/data/fences/fenceAtoms";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline } from "@/data/splines/splineAtoms";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef } from "react";
import { Stage } from "react-konva";
import { Updater } from "use-immer";
import { Items } from "../subviews/Items";
import { Fences } from "../subviews/Fences";
import { Splines } from "../subviews/Splines";
import { WaterBodies } from "../subviews/WaterBodies";
import { Tiles } from "../subviews/Tiles";
import { Supertiles } from "../subviews/Supertiles";
import { 
  HeaderData, 
  ItemData, 
  LiquidData, 
  FenceData, 
  SplineData,
  TerrainData 
} from "@/python/structSpecs/ottoMaticLevelData";

enum View {
  fences,
  water,
  items,
  splines,
  tiles,
  supertiles,
}

export type StageData = {
  scale: number;
  x: number;
  y: number;
};

export function KonvaView({
  headerData,
  setHeaderData,
  itemData,
  setItemData,
  liquidData,
  setLiquidData,
  fenceData,
  setFenceData,
  splineData,
  setSplineData,
  terrainData,
  setTerrainData,
  mapImages,
  view,
  stage,
  setStage,
}: {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  liquidData: LiquidData;
  setLiquidData: Updater<LiquidData>;
  fenceData: FenceData;
  setFenceData: Updater<FenceData>;
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  view: View;
  stage: StageData;
  setStage: Updater<StageData>;
}) {
  const setSelectedFence = useSetAtom(SelectedFence);
  const setSelectedItem = useSetAtom(SelectedItem);
  const setSelectedSpline = useSetAtom(SelectedSpline);
  const setSelectedWaterBody = useSetAtom(SelectedWaterBody);
  const clickToAddItem = useAtomValue(ClickToAddItem);

  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <Stage
      width={stageRef.current?.offsetWidth ?? 3000}
      height={stageRef.current?.offsetHeight ?? 2000}
      scaleX={stage.scale}
      scaleY={stage.scale}
      x={stage.x}
      y={stage.y}
      draggable={true}
      onClick={(e) => {
        if (clickToAddItem === undefined) return;
        const stage = e.target.getStage();

        const pos = stage?.getRelativePointerPosition();
        if (!pos) return;
        const x = Math.round(pos.x);
        const z = Math.round(pos.y);

        setItemData((itemData) => {
          itemData.Itms[1000].obj.push({
            x: x,
            z: z,
            type: clickToAddItem,
            flags: 0,
            p0: 0,
            p1: 0,
            p2: 0,
            p3: 0,
          });
        });
      }}
      onDblClick={() => {
        setSelectedFence(undefined);
        setSelectedItem(undefined);
        setSelectedSpline(undefined);
        setSelectedWaterBody(null);
      }}
      onWheel={(e) => {
        /*from https://stackoverflow.com/questions/52054848/how-to-react-konva-zooming-on-scroll */
        e.evt.preventDefault();

        const scaleBy = 1.05;
        const stage = e.target.getStage();
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const mousePointTo = {
          x: pointerPosition.x / oldScale - stage.x() / oldScale,
          y: pointerPosition.y / oldScale - stage.y() / oldScale,
        };

        const newScale =
          e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        setStage({
          scale: newScale,
          x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
          y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
        });
      }}
    >
      {terrainData.STgd && <Supertiles terrainData={terrainData} setTerrainData={setTerrainData} mapImages={mapImages} />}
      {view === View.tiles && (
        <Tiles
          headerData={headerData}
          terrainData={terrainData}
          setTerrainData={setTerrainData}
          isEditingTopology={view === View.tiles}
        />
      )}
      {view === View.tiles ||
        (view === View.supertiles && (
          <>
            <WaterBodies liquidData={liquidData} setLiquidData={setLiquidData} />
            <Fences fenceData={fenceData} setFenceData={setFenceData} />
            <Items itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />
            <Splines splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />
          </>
        ))}
      {view === View.fences && (
        <>
          <WaterBodies liquidData={liquidData} setLiquidData={setLiquidData} />
          <Items itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />
          <Splines splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />
          <Fences fenceData={fenceData} setFenceData={setFenceData} />
        </>
      )}
      {view === View.water && (
        <>
          <Fences fenceData={fenceData} setFenceData={setFenceData} />
          <Items itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />
          <Splines splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />
          <WaterBodies liquidData={liquidData} setLiquidData={setLiquidData} />
        </>
      )}
      {view === View.splines && (
        <>
          <WaterBodies liquidData={liquidData} setLiquidData={setLiquidData} />
          <Items itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />
          <Fences fenceData={fenceData} setFenceData={setFenceData} />
          <Splines splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />
        </>
      )}
      {view === View.items && (
        <>
          <WaterBodies liquidData={liquidData} setLiquidData={setLiquidData} />
          <Splines splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />
          <Fences fenceData={fenceData} setFenceData={setFenceData} />
          <Items itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />
        </>
      )}
    </Stage>
  );
}
