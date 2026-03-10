import type { Updater } from "use-immer";
import type {
  SplineItem as SplineItemType,
  SplineNub as SplineNubType,
  SplineData,
} from "@/python/structSpecs/LevelTypes";
import { Line, Circle, Rect, Text } from "react-konva";
import type Konva from "konva";
import { useAtom, useAtomValue } from "jotai";
import { memo, useMemo, useState, useRef } from "react";
import { getPoints } from "../../../utils/spline";
import { SelectedSpline } from "../../../data/splines/splineAtoms";
import { getSplineItemName } from "@/data/splines/getSplineItemNames";
import { Globals } from "@/data/globals/globals";
import {
  selectSplineNubs,
  // selectSplinePoints,
  selectSplineItems,
} from "../../../data/selectors";
import { updateSplinePointsFromNubs, SPLINE_KEY_BASE } from "./splineUtils";
import {
  detectSplineType,
  shouldShowFirstNub,
  shouldSyncFirstAndLastNubs,
} from "@/data/splines/splineTypeDetection";
import {
  HoverNameTag,
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ITEM_TAG_GAP,
  ItemTypeNumber,
} from "../shared/nodeVisuals";

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
    /** Ref to the Konva Line node — used to fix the drag-end flash glitch. */
    const lineRef = useRef<Konva.Line | null>(null);

    const nubs = selectSplineNubs(splineData, SPLINE_KEY_BASE + splineIdx);
    const items = selectSplineItems(splineData, SPLINE_KEY_BASE + splineIdx);

    const splinePts = splineData.SpPt?.[SPLINE_KEY_BASE + splineIdx]?.obj;
    
    // Detect if this spline is circular (closed loop) or open (distinct start/end)
    const splineType = useMemo(() => detectSplineType(nubs), [nubs]);
    const showFirstNub = shouldShowFirstNub(splineType);
    const syncFirstAndLast = shouldSyncFirstAndLastNubs(splineType);
    
    const points = useMemo(() => {
      if (!splinePts) return [];
      return splinePts.flatMap((point) => [point.x, point.z]);
    }, [splinePts]);

    if (!splinePts) return null;

    return (
      <>
        <Line
          ref={lineRef}
          points={points}
          stroke={selectedSpline === splineIdx ? "red" : "blue"}
          strokeWidth={selectedSpline === splineIdx ? 5 : 2}
          perfectDrawEnabled={false}
          draggable
          onDragStart={() => {
            // Store the initial positions of the nubs when dragging starts
            setInitialDragState(
              nubs.map((nub) => ({
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

            const updatedNubs = initialDragState.map((initPos) => ({
              x: initPos.x + dragDx,
              z: initPos.z + dragDz,
            }));

            // Pre-translate the Konva Line's own points to include the drag offset and
            // reset its position to (0,0) before React re-renders. This eliminates the
            // one-frame flash where the line would visually jump back to its old position.
            if (lineRef.current) {
              const rawPts = lineRef.current.points();
              lineRef.current.points(
                rawPts.map((v, i) => (i % 2 === 0 ? v + dragDx : v + dragDz)),
              );
              lineRef.current.x(0);
              lineRef.current.y(0);
              lineRef.current.getLayer()?.batchDraw();
            }

            // Commit updated nub positions once, on drag end
            setSplineData((draft) => {
              const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
              if (spNb) {
                spNb.obj = updatedNubs;
              }
              const spln =
                draft.Spln?.[1000]?.obj?.[splineIdx];
              if (spln) {
                spln.numNubs = updatedNubs.length;
              }
            });

            updateSplinePointsFromNubs(splineIdx, setSplineData);
            setInitialDragState(null);
          }}
        />
        {nubs.map((nub, nubIdx) => {
          // For circular splines, hide the first nub (it's merged with the last)
          // For open splines (Billy Frontier), show both endpoints
          if (nubIdx === 0 && !showFirstNub) return null;
          return (
            <SplineNub
              key={nubIdx}
              nub={nub}
              nubIdx={nubIdx}
              splineIdx={splineIdx}
              setSplineData={setSplineData}
              syncFirstAndLast={syncFirstAndLast}
              onNubChange={() => updateSplinePointsFromNubs(splineIdx, setSplineData)}
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
    setSplineData,
    syncFirstAndLast,
    onNubChange,
  }: {
    nub: SplineNubType;
    nubIdx: number;
    splineIdx: number;
    setSplineData: Updater<SplineData>;
    syncFirstAndLast: boolean;
    onNubChange: () => void;
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
          stroke="black"
          strokeWidth={2}
          perfectDrawEnabled={false}
          onMouseDown={() => setSelectedSpline(splineIdx)}
          onDragStart={() => setSelectedSpline(splineIdx)}
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

                // For circular splines, sync first and last nub positions
                if (syncFirstAndLast && nubIdx === currentNubs.length - 1) {
                  updatedNubs[0] = { x: newX, z: newZ };
                }

                const spNb = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
                if (spNb) {
                  spNb.obj = updatedNubs;
                }

                const firstNub = updatedNubs[0];
                const workingNubs =
                  updatedNubs.length > 1 && syncFirstAndLast
                    ? updatedNubs.slice(0, -1)
                    : updatedNubs;
                const newPoints =
                  workingNubs.length === 1 && firstNub
                    ? [{ x: firstNub.x, z: firstNub.z }]
                    : getPoints(workingNubs);

                const spPt = draft.SpPt?.[SPLINE_KEY_BASE + splineIdx];
                if (spPt) {
                  spPt.obj = newPoints;
                }

                const spln =
                  draft.Spln?.[1000]?.obj?.[splineIdx];
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

              // For circular splines, sync first and last nub positions
              if (syncFirstAndLast && nubIdx === currentNubs.length - 1) {
                updatedNubs[0] = { x: newX, z: newZ };
              }

              const spNbEntry = draft.SpNb?.[SPLINE_KEY_BASE + splineIdx];
              if (spNbEntry) spNbEntry.obj = updatedNubs;
              const splnEntry =
                draft.Spln?.[1000]?.obj?.[splineIdx];
              if (splnEntry) splnEntry.numNubs = updatedNubs.length;
            });

            onNubChange();
          }}
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        />
        <Text
          x={nub.x - 8}
          y={nub.z - 8}
          width={16}
          height={16}
          text={nubIdx.toString()}
          fill="white"
          opacity={0.8}
          fontStyle="bold"
          align="center"
          verticalAlign="middle"
          listening={false}
          perfectDrawEnabled={false}
          onMouseOver={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          visible={!hovering}
        />
      </>
    );
  },
);

const SplineItem = memo(
  ({ x, z, item }: { x: number; z: number; item: SplineItemType }) => {
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
          perfectDrawEnabled={false}
        />

        {!hovering && (
          <ItemTypeNumber
            x={x - ITEM_BOX_OFFSET}
            y={z - ITEM_BOX_OFFSET}
            value={item.type.toString()}
            fill="white"
          />
        )}

        {hovering && (
          <HoverNameTag
            x={x - ITEM_BOX_OFFSET + ITEM_BOX_SIZE + ITEM_TAG_GAP}
            y={z - ITEM_BOX_OFFSET}
            text={getSplineItemName(globals, item.type)}
            fill="blue"
            textColor="white"
          />
        )}
      </>
    );
  },
);
