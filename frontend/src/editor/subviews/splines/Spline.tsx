<<<<<<< HEAD
import type { Updater } from "use-immer";
import type {
  SplineItem,
  SplineNub,
} from "@/python/structSpecs/LevelTypes";
import type { SplineData } from "@/python/structSpecs/LevelTypes";
=======
import { Updater } from "use-immer";
import {
  ottoMaticLevel,
  ottoSplineItem,
  ottoSplineNub,
} from "../../../python/structSpecs/ottoMaticInterface";
>>>>>>> origin/main
import { Line, Circle, Rect, Label, Tag, Text } from "react-konva";
import type Konva from "konva";
import { useAtom, useAtomValue } from "jotai";
import { memo, useMemo, useState, useRef } from "react";
import { getPoints } from "../../../utils/spline";
import { SelectedSpline } from "../../../data/splines/splineAtoms";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { Globals } from "@/data/globals/globals";
<<<<<<< HEAD
import {
  selectSplineNubs,
  selectSplinePoints,
  selectSplineItems,
} from "../../../data/selectors";
import { updateSplinePointsFromNubs, SPLINE_KEY_BASE } from "./splineUtils";
=======

export function updateSplinePoints(
  splineIdx: number,
  setData: Updater<ottoMaticLevel>,
) {
  setData((data) => {
    const newPoints =
      data.SpNb[SPLINE_KEY_BASE + splineIdx].obj.length === 1
        ? [
            {
              x: data.SpNb[SPLINE_KEY_BASE + splineIdx].obj[0].x,
              z: data.SpNb[SPLINE_KEY_BASE + splineIdx].obj[0].z,
            },
          ]
        : getPoints(data.SpNb[SPLINE_KEY_BASE + splineIdx].obj);
    data.SpPt[SPLINE_KEY_BASE + splineIdx].obj = newPoints;
  });
}
>>>>>>> origin/main

export const Spline = memo(
  ({
    data,
    setData,
    splineIdx,
  }: {
    data: ottoMaticLevel;
    setData: Updater<ottoMaticLevel>;
    splineIdx: number;
  }) => {
    const selectedSpline = useAtomValue(SelectedSpline);
    const [initialDragState, setInitialDragState] = useState<
      { x: number; z: number }[] | null
    >(null);

<<<<<<< HEAD
    const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + splineIdx);
    const items = selectSplineItems(splineData, SPLINE_KEY_BASE + splineIdx);
    const splinePoints = selectSplinePoints(
      splineData,
      SPLINE_KEY_BASE + splineIdx,
    );
=======
    const nubs = data.SpNb[SPLINE_KEY_BASE + splineIdx].obj;
    const items = data.SpIt[SPLINE_KEY_BASE + splineIdx].obj;
>>>>>>> origin/main

    const points = useMemo(() => {
      return data.SpPt[SPLINE_KEY_BASE + splineIdx].obj.flatMap((point) => [
        point.x,
        point.z,
      ]);
    }, [data.SpPt[SPLINE_KEY_BASE + splineIdx].obj]);

    return (
      <>
        <Line
          points={points}
          stroke={selectedSpline === splineIdx ? "red" : "blue"}
          strokeWidth={selectedSpline === splineIdx ? 5 : 2}
          draggable
          onDragStart={() => {
            // Store the initial positions of the nubs when dragging starts
            setInitialDragState(
<<<<<<< HEAD
              nubs.map((nub) => ({
=======
              data.SpNb[SPLINE_KEY_BASE + splineIdx].obj.map((nub) => ({
>>>>>>> origin/main
                x: nub.x,
                z: nub.z,
              })),
            );
          }}
          onDragMove={() => {
            // No per-frame state updates while dragging the whole spline.
            // Konva applies visual transform during drag — we will commit changes on drag end.
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

<<<<<<< HEAD
            const updatedNubs = initialDragState.map((initPos) => ({
              x: initPos.x + dragDx,
              z: initPos.z + dragDz,
            }));

            // Commit updated nub positions once, on drag end
            setSplineData((draft) => {
              const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
              if (spNb) {
                spNb.obj = updatedNubs;
              }
              const spln =
                draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
              if (spln) {
                spln.numNubs = updatedNubs.length;
              }
            });

            updateSplinePointsFromNubs(splineIdx, setSplineData);
            // Reset Konva node transform after committing
            try {
              e.target.x(0);
              e.target.y(0);
            } catch (err) {
              // Best-effort: resetting Konva node transform. Log and continue.
              // Not a user-facing error; keep behavior unchanged.
              console.warn("Failed to reset Konva node transform:", err);
            }
            setInitialDragState(null);
=======
            setData((draft) => {
              const currentNubs = draft.SpNb[SPLINE_KEY_BASE + splineIdx].obj;
              for (let i = 0; i < currentNubs.length; i++) {
                currentNubs[i].x = initialDragState[i].x + dragDx;
                currentNubs[i].z = initialDragState[i].z + dragDz;
              }
            });
            updateSplinePoints(splineIdx, setData);
            e.target.x(0); // Reset line position after dragging nubs
            e.target.y(0); // Reset line position after dragging nubs
            setInitialDragState(null); // Clear initial drag state
>>>>>>> origin/main
          }}
        />
        {nubs.map((nub, nubIdx) => {
          if (nubIdx === 0) return null;
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
              x={points[pointIdx] ?? 0}
              z={points[pointIdx + 1] ?? 0}
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
    setData,
  }: {
    nub: SplineNub;
    nubIdx: number;
    splineIdx: number;
    setData: Updater<ottoMaticLevel>;
  }) => {
    const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
    const [hovering, setHovering] = useState(false);
    const nubRafRef = useRef<number | null>(null);
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
<<<<<<< HEAD
          onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
            const newX = Math.round(e.target.x());
            const newZ = Math.round(e.target.y());

            if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
            nubRafRef.current = requestAnimationFrame(() => {
              setSplineData((draft) => {
                const currentNubs =
                  draft.SpNb?.[SPLINE_KEY_BASE + splineIdx]?.obj || [];
                const updatedNubs = [...currentNubs];
                updatedNubs[nubIdx] = { x: newX, z: newZ };

                //Modify "hidden" final nub, which is to be in the same position as the first nub
                if (nubIdx === currentNubs.length - 1) {
                  updatedNubs[0] = { x: newX, z: newZ };
                }

                const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
                if (spNb) {
                  spNb.obj = updatedNubs;
                }

                const firstNub = updatedNubs[0];
                const newPoints =
                  updatedNubs.length === 1 && firstNub
                    ? [{ x: firstNub.x, z: firstNub.z }]
                    : getPoints(updatedNubs);

                const spPt = draft.SpPt?.[SPLINE_KEY_BASE + splineIdx];
                if (spPt) {
                  spPt.obj = newPoints;
                }

                const spln =
                  draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
                if (spln) {
                  spln.numNubs = updatedNubs.length;
                  spln.numPoints = newPoints.length;
                }
              });
            });
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
            const newX = Math.round(e.target.x());
            const newZ = Math.round(e.target.y());

            setSplineData((draft) => {
              const currentNubs =
                draft.SpNb?.[SPLINE_KEY_BASE + splineIdx]?.obj || [];
              const updatedNubs = [...currentNubs];
              updatedNubs[nubIdx] = { x: newX, z: newZ };

              //Modify "hidden" final nub, which is to be in the same position as the first nub
              if (nubIdx === currentNubs.length - 1) {
                updatedNubs[0] = { x: newX, z: newZ };
              }

              const spNbEntry = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
              if (spNbEntry) spNbEntry.obj = updatedNubs;
              const splnEntry =
                draft.Spln?.[1000]?.obj?.[SPLINE_KEY_BASE + splineIdx];
              if (splnEntry) splnEntry.numNubs = updatedNubs.length;
            });

            updateSplinePointsFromNubs(splineIdx, setSplineData);
=======
          onDragEnd={(e) => {
            setData((data) => {
              data.SpNb[SPLINE_KEY_BASE + splineIdx].obj[nubIdx] = {
                x: Math.round(e.target.x()),
                z: Math.round(e.target.y()),
              };

              //Modify "hidden" final nub, which is to be in the same position as the first nub
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
            updateSplinePoints(splineIdx, setData);
>>>>>>> origin/main
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
  ({ x, z, item }: { x: number; z: number; item: SplineItem }) => {
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

// SPLINE_KEY_BASE is now exported from splineUtils.ts
