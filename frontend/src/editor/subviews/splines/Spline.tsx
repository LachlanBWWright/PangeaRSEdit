import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Line, Text, Circle } from "react-konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useSetAtom } from "jotai";
import { useMemo, useState } from "react";
import { getPoints } from "../../../utils/spline";
import { SelectedSpline } from "../../../data/splines/splineAtoms";

export function Spline({
  data,
  setData,
  splineIdx,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  splineIdx: number;
}) {
  const setSelectedSpline = useSetAtom(SelectedSpline);
  //const spline = data.Spln

  if (splineIdx === 0) {
    console.log(data.Spln); //Splines
    console.log(data.SpIt); //Spline items (Same params as items)
    console.log(data.SpNb); //Spline nubs
    console.log(data.SpPt); //Spline points
    console.log("GetPoints");
    console.log(getPoints(data.SpNb[SPLINE_KEY_BASE + splineIdx].obj));
  }

  const items = data.SpIt[SPLINE_KEY_BASE + splineIdx].obj;
  const nubs = data.SpNb[SPLINE_KEY_BASE + splineIdx].obj;
  //const points = data.SpPt[SPLINE_KEY_BASE + splineIdx].obj;

  const nubPoints = useMemo(() => {
    return data.SpNb[SPLINE_KEY_BASE + splineIdx].obj.flatMap((nub) => [
      nub.x,
      nub.z,
    ]);
  }, [data.SpNb[SPLINE_KEY_BASE + splineIdx].obj]);

  const points = useMemo(() => {
    return data.SpPt[SPLINE_KEY_BASE + splineIdx].obj.flatMap((point) => [
      point.x,
      point.z,
    ]);
  }, [data.SpPt[SPLINE_KEY_BASE + splineIdx].obj]);

  const showSplinePoints = false;

  //if (item === null || item === undefined) return <></>;

  return (
    <>
      {nubs.map((nub, nubIdx) => (
        <Circle
          x={nub.x}
          y={nub.z}
          radius={10}
          draggable
          fill="blue"
          onMouseDown={() => setSelectedSpline(splineIdx)}
          /*           onMouseDown={() => setSelectedFence(idx)}
          onDragStart={() => {
            setSelectedFence(idx);
          }}
          onDragEnd={(e) => {
            setNub([Math.round(e.target.x()), Math.round(e.target.y())]);
          }} */
        />
      ))}
      {/* Approximation of spline point formula */}
      {/*      {showSplinePoints && 
        points.map((point, pointIdx) => (
            <Circle x={point.x} y={point.z} radius={2} draggable fill="red" />
            ))}  */}
      <Line tension={0.45} stroke="red" points={nubPoints} />
      <Line points={points} stroke="blue" />
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

const SPLINE_KEY_BASE = 1000;
