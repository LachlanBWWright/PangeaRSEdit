import { SelectedFence } from "@/data/fences/fenceAtoms";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline } from "@/data/splines/splineAtoms";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { useAtomValue, useSetAtom } from "jotai";
<<<<<<< HEAD
import { useRef, useCallback, useState, useEffect } from "react";
=======
import { useRef } from "react";
>>>>>>> origin/main
import { Stage } from "react-konva";
import { Updater } from "use-immer";
import { Items } from "../subviews/Items";
import { Fences } from "../subviews/Fences";
import { Splines } from "../subviews/Splines";
import { WaterBodies } from "../subviews/WaterBodies";
import { Tiles } from "../subviews/Tiles";
import { Supertiles } from "../subviews/Supertiles";
<<<<<<< HEAD
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
=======
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
>>>>>>> origin/main

enum View {
  fences,
  water,
  items,
  splines,
  tiles,
  supertiles,
}

export interface StageData {
  scale: number;
  x: number;
  y: number;
}

export function KonvaView({
  data,
  setData,
  mapImages,
  view,
  stage,
  setStage,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
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

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 3000,
    height: 2000,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const obs = new ResizeObserver(() => updateSize());
      if (containerRef.current) obs.observe(containerRef.current);
      return () => obs.disconnect();
    }
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={containerSize.width}
        height={containerSize.height}
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

<<<<<<< HEAD
          // Use non-null updater so child components can rely on non-null shape
          setItemDataNotNull((itemData) => {
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
=======
        setData((data) => {
          data.Itms[1000].obj.push({
            x: x,
            z: z,
            type: clickToAddItem,
            flags: 0,
            p0: 0,
            p1: 0,
            p2: 0,
            p3: 0,
>>>>>>> origin/main
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

<<<<<<< HEAD
          setStage({
            scale: newScale,
            x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
            y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
          });
        }}
      >
        {/* Render supertiles - for Bugdom 1 (has Layr) or other games (has STgd) */}
        {terrainData && (terrainData.STgd || terrainData.Layr) && (
          <Supertiles
            headerData={headerData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}
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
              {liquidData && (
                <WaterBodies
                  liquidData={liquidData}
                  setLiquidData={setLiquidDataNotNull}
                />
              )}
              {fenceData && (
                <Fences
                  fenceData={fenceData}
                  setFenceData={setFenceDataNotNull}
                />
              )}
              {itemData && (
                <Items itemData={itemData} setItemData={setItemDataNotNull} />
              )}
              {splineData && (
                <Splines
                  splineData={splineData}
                  setSplineData={setSplineDataNotNull}
                />
              )}
            </>
          ))}
        {view === View.fences && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
              />
            )}
          </>
        )}
        {view === View.water && (
          <>
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
          </>
        )}
        {view === View.splines && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
            )}
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
              />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
          </>
        )}
        {view === View.items && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
            )}
          </>
        )}
      </Stage>
    </div>
=======
        setStage({
          scale: newScale,
          x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
          y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
        });
      }}
    >
      {data.STgd && <Supertiles data={data} mapImages={mapImages} />}
      {view === View.tiles && (
        <Tiles
          data={data}
          setData={setData}
          isEditingTopology={view === View.tiles}
        />
      )}
      {view === View.tiles ||
        (view === View.supertiles && (
          <>
            <WaterBodies data={data} setData={setData} />
            <Fences data={data} setData={setData} />
            <Items data={data} setData={setData} />
            <Splines data={data} setData={setData} />
          </>
        ))}
      {view === View.fences && (
        <>
          <WaterBodies data={data} setData={setData} />
          <Items data={data} setData={setData} />
          <Splines data={data} setData={setData} />
          <Fences data={data} setData={setData} />
        </>
      )}
      {view === View.water && (
        <>
          <Fences data={data} setData={setData} />
          <Items data={data} setData={setData} />
          <Splines data={data} setData={setData} />
          <WaterBodies data={data} setData={setData} />
        </>
      )}
      {view === View.splines && (
        <>
          <WaterBodies data={data} setData={setData} />
          <Items data={data} setData={setData} />
          <Fences data={data} setData={setData} />
          <Splines data={data} setData={setData} />
        </>
      )}
      {view === View.items && (
        <>
          <WaterBodies data={data} setData={setData} />
          <Splines data={data} setData={setData} />
          <Fences data={data} setData={setData} />
          <Items data={data} setData={setData} />
        </>
      )}
    </Stage>
>>>>>>> origin/main
  );
}
