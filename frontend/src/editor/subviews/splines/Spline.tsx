import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Line, Circle } from "react-konva";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
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
  const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);

  const nubs = data.SpNb[SPLINE_KEY_BASE + splineIdx].obj;

  const points = useMemo(() => {
    return data.SpPt[SPLINE_KEY_BASE + splineIdx].obj.flatMap((point) => [
      point.x,
      point.z,
    ]);
  }, [data.SpPt[SPLINE_KEY_BASE + splineIdx].obj]);

  //Update points when nub positions change
  useEffect(() => {
    const newPoints = getPoints(data.SpNb[SPLINE_KEY_BASE + splineIdx].obj);

    setData((data) => {
      data.SpPt[SPLINE_KEY_BASE + splineIdx].obj = newPoints;
    });
  }, [data.SpNb[SPLINE_KEY_BASE + splineIdx]]);

  //if (item === null || item === undefined) return <></>;

  return (
    <>
      {nubs.map((nub, nubIdx) => {
        if (nubIdx === 0) return <></>;
        return (
          <Circle
            x={nub.x}
            y={nub.z}
            key={nubIdx}
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
          />
        );
      })}
      <Line
        points={points}
        stroke={selectedSpline === splineIdx ? "red" : "blue"}
      />
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
