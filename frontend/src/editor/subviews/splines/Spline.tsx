import { Updater } from "use-immer";
import {
  ottoSplineItem,
  ottoSplineNub,
} from "../../../python/structSpecs/ottoMaticInterface";
import { SplineData } from "../../../python/structSpecs/ottoMaticLevelData";
import { Line, Circle, Rect, Label, Tag, Text } from "react-konva";
import { useAtom, useAtomValue } from "jotai";
import { memo, useMemo, useState } from "react";
import { getPoints } from "../../../utils/spline";
import { SelectedSpline } from "../../../data/splines/splineAtoms";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { Globals } from "@/data/globals/globals";
import { 
  selectSplineNubs, 
  selectSplinePoints, 
  selectSplineItems,
  updateSplineNubs,
  updateSplinePoints 
} from "../../../data/selectors";

export function updateSplinePointsFromNubs(
  splineIdx: number,
  setSplineData: Updater<SplineData>,
) {
  setSplineData((splineData) => {
    const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + splineIdx);
    const newPoints = nubs.length === 1
      ? [{ x: nubs[0].x, z: nubs[0].z }]
      : getPoints(nubs);
    
    updateSplinePoints(setSplineData, SPLINE_KEY_BASE + splineIdx, newPoints);
  });
}

export const Spline = memo(
  ({
    splineData,
    setSplineData,
    splineIdx,
  }: {
    splineData: SplineData;
    setSplineData: Updater<SplineData>;
    splineIdx: number;
  }) => {
    const selectedSpline = useAtomValue(SelectedSpline);
    const [initialDragState, setInitialDragState] = useState<
      { x: number; z: number }[] | null
    >(null);

    const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + splineIdx);
    const items = selectSplineItems(splineData, SPLINE_KEY_BASE + splineIdx);
    const splinePoints = selectSplinePoints(splineData, SPLINE_KEY_BASE + splineIdx);

    const points = useMemo(() => {
      return splinePoints.flatMap((point) => [point.x, point.z]);
    }, [splinePoints]);

    return (
      <>
        <Line
          points={points}
          stroke={selectedSpline === splineIdx ? "red" : "blue"}
          strokeWidth={selectedSpline === splineIdx ? 5 : 2}
          draggable
          onDragStart={() => {
            // Store the initial positions of the nubs when dragging starts
            setInitialDragState(nubs.map((nub) => ({
              x: nub.x,
              z: nub.z,
            })));
          }}
          onDragEnd={(e) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            const updatedNubs = initialDragState.map((initPos) => ({
              x: initPos.x + dragDx,
              z: initPos.z + dragDz,
            }));
            
            updateSplineNubs(setSplineData, SPLINE_KEY_BASE + splineIdx, updatedNubs);
            updateSplinePointsFromNubs(splineIdx, setSplineData);
            e.target.x(0); // Reset line position after dragging nubs
            e.target.y(0); // Reset line position after dragging nubs
            setInitialDragState(null); // Clear initial drag state
          }}
        />
        {nubs.map((nub, nubIdx) => {
          if (nubIdx === 0) return;
          return (
            <SplineNub
              key={nubIdx}
              nub={nub}
              nubIdx={nubIdx}
              splineIdx={splineIdx}
              setSplineData={setSplineData}
            />
          );
        })}
        {items.map((item, itemIdx) => {
          //Get approx nub
          let pointIdx = Math.floor(
            points.length * Math.min(0.99, item.placement),
          );

          //Odd-indexed points are y, we want x
          if (pointIdx % 2 !== 0) pointIdx--;

          return (
            <SplineItem
              key={itemIdx}
              x={points[pointIdx]}
              z={points[pointIdx + 1]}
              item={item}
            />
          );
        })}
      </>
    );
  },
);

const SplineNub = memo(
  ({
    nub,
    nubIdx,
    splineIdx,
    setSplineData,
  }: {
    nub: ottoSplineNub;
    nubIdx: number;
    splineIdx: number;
    setSplineData: Updater<SplineData>;
  }) => {
    const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
    const [hovering, setHovering] = useState(false);
    return (
      <>
        <Circle
          x={nub.x}
          y={nub.z}
          radius={10}
          draggable
          fill={selectedSpline === splineIdx ? "red" : "blue"}
          onMouseDown={() => setSelectedSpline(splineIdx)}
          onDragStart={() => setSelectedSpline(splineIdx)}
          onDragEnd={(e) => {
            const newX = Math.round(e.target.x());
            const newZ = Math.round(e.target.y());
            
            setSplineData((splineData) => {
              const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + splineIdx);
              const updatedNubs = [...nubs];
              updatedNubs[nubIdx] = { x: newX, z: newZ };

              //Modify "hidden" final nub, which is to be in the same position as the first nub
              if (nubIdx === nubs.length - 1) {
                updatedNubs[0] = { x: newX, z: newZ };
              }
              
              updateSplineNubs(setSplineData, SPLINE_KEY_BASE + splineIdx, updatedNubs);
            });
            updateSplinePointsFromNubs(splineIdx, setSplineData);
          }}
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        />
        <Text
          x={nub.x - 4}
          y={nub.z - 4}
          text={nubIdx.toString()}
          fill="white"
          opacity={0.8}
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          visible={!hovering}
        />
      </>
    );
  },
);

const ITEM_BOX_SIZE = 12;
const ITEM_BOX_OFFSET = ITEM_BOX_SIZE / 2;

const SplineItem = memo(
  ({ x, z, item }: { x: number; z: number; item: ottoSplineItem }) => {
    const [hovering, setHovering] = useState(false);
    const globals = useAtomValue(Globals);
    return (
      <>
        <Rect
          x={x - ITEM_BOX_OFFSET}
          y={z - ITEM_BOX_OFFSET}
          width={ITEM_BOX_SIZE}
          height={ITEM_BOX_SIZE}
          stroke="blue"
          fill="blue"
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        />

        <Text
          text={item.type.toString()}
          fill="white"
          visible={!hovering}
          x={x - ITEM_BOX_OFFSET}
          y={z - ITEM_BOX_OFFSET}
          draggable
          fontSize={8}
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        />

        <Label opacity={1} visible={hovering} x={x + 15} y={z}>
          <Tag fill="blue" />
          <Text
            text={
              getSplineItemName(
                globals,
                item.type,
              ) /* splineItemTypeNames[item.type] */
            }
            fontSize={8}
            fill="white"
          />
        </Label>
      </>
    );
  },
);

export function getColour(index: number) {
  switch (index % 5) {
    case 0:
      return "#339933";
    case 1:
      return "#3399ff";
    case 2:
      return "#993399";
    case 3:
      return "#ff9933";
    case 4:
    default:
      return "#ff3399";
  }
}

export const SPLINE_KEY_BASE = 1000;
