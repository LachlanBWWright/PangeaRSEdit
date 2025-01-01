import { Updater } from "use-immer";
import {
  ottoMaticLevel,
  ottoSplineItem,
  ottoSplineNub,
} from "../../../python/structSpecs/ottoMaticInterface";
import { Line, Circle, Rect, Label, Tag, Text } from "react-konva";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { getPoints } from "../../../utils/spline";
import { SelectedSpline } from "../../../data/splines/splineAtoms";
import { splineItemTypeNames } from "../../../data/splines/ottoSplineItemType";

export function Spline({
  data,
  setData,
  splineIdx,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  splineIdx: number;
}) {
  const selectedSpline = useAtomValue(SelectedSpline);

  const nubs = data.SpNb[SPLINE_KEY_BASE + splineIdx].obj;
  const items = data.SpIt[SPLINE_KEY_BASE + splineIdx].obj;

  const points = useMemo(() => {
    return data.SpPt[SPLINE_KEY_BASE + splineIdx].obj.flatMap((point) => [
      point.x,
      point.z,
    ]);
  }, [data.SpPt[SPLINE_KEY_BASE + splineIdx].obj]);

  //Update points when nub positions change
  useEffect(() => {
    const newPoints =
      data.SpNb[SPLINE_KEY_BASE + splineIdx].obj.length === 1
        ? [
            {
              x: data.SpNb[SPLINE_KEY_BASE + splineIdx].obj[0].x,
              z: data.SpNb[SPLINE_KEY_BASE + splineIdx].obj[0].z,
            },
          ]
        : getPoints(data.SpNb[SPLINE_KEY_BASE + splineIdx].obj);

    setData((data) => {
      data.SpPt[SPLINE_KEY_BASE + splineIdx].obj = newPoints;
    });
  }, [data.SpNb[SPLINE_KEY_BASE + splineIdx]]);

  //if (item === null || item === undefined) return <></>;

  return (
    <>
      <Line
        points={points}
        stroke={selectedSpline === splineIdx ? "red" : "blue"}
      />
      {nubs.map((nub, nubIdx) => {
        if (nubIdx === 0) return;
        return (
          <SplineNub
            key={nubIdx}
            nub={nub}
            nubIdx={nubIdx}
            splineIdx={splineIdx}
            setData={setData}
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
}

function SplineNub({
  nub,
  nubIdx,
  splineIdx,
  setData,
}: {
  nub: ottoSplineNub;
  nubIdx: number;
  splineIdx: number;
  setData: Updater<ottoMaticLevel>;
}) {
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
          setData((data) => {
            data.SpNb[SPLINE_KEY_BASE + splineIdx].obj[nubIdx] = {
              x: Math.round(e.target.x()),
              z: Math.round(e.target.y()),
            };

            if (
              nubIdx ===
              data.SpNb[SPLINE_KEY_BASE + splineIdx].obj.length - 1
            ) {
              data.SpNb[SPLINE_KEY_BASE + splineIdx].obj[0] = {
                x: Math.round(e.target.x()),
                z: Math.round(e.target.y()),
              };
            }
          });
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
}

function SplineItem({
  x,
  z,
  item,
}: {
  x: number;
  z: number;
  item: ottoSplineItem;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <>
      <Rect
        x={x}
        y={z}
        width={Math.max(10, item.type.toString().length * 5)}
        height={10}
        stroke="blue"
        fill="blue"
        onMouseOver={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      />

      <Text
        text={item.type.toString()}
        fill="white"
        visible={!hovering}
        x={x}
        y={z}
        draggable
        onMouseOver={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      />

      <Label opacity={1} visible={hovering} x={x + 15} y={z}>
        <Tag fill="blue" />
        <Text text={splineItemTypeNames[item.type]} fill="white" />
      </Label>
    </>
  );
}

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
