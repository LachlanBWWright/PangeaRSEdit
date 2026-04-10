import type { Updater } from "use-immer";
import type {
  SplineItem as SplineItemType,
  SplineNub as SplineNubType,
  SplineData,
} from "@/python/structSpecs/LevelTypes";
import { Line, Circle, Rect, Text } from "react-konva";
import type Konva from "konva";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { memo, useCallback, useMemo, useState, useRef } from "react";
import { getPoints } from "../../../utils/spline";
import { SelectedSpline, SelectedSplineNub } from "../../../data/splines/splineAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { View } from "@/editor/viewEnum";
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
    /** Ref to the Konva Line node — used to fix the drag-end flash glitch and nub-drag preview. */
    const lineRef = useRef<Konva.Line | null>(null);
    /** Mutable preview nubs during a nub drag — avoids React state updates per frame. */
    const previewNubsRef = useRef<{ x: number; z: number }[] | null>(null);

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

    /** Called by SplineNub on each drag frame — updates the line imperatively with no React state. */
    const handleNubPreviewMove = useCallback(
      (nubIdx: number, newX: number, newZ: number) => {
        if (!lineRef.current) return;
        if (!previewNubsRef.current) {
          previewNubsRef.current = nubs.map((n) => ({ x: n.x, z: n.z }));
        }
        previewNubsRef.current[nubIdx] = { x: newX, z: newZ };
        if (syncFirstAndLast && nubIdx === previewNubsRef.current.length - 1) {
          previewNubsRef.current[0] = { x: newX, z: newZ };
        }
        const preview = previewNubsRef.current;
        const workingNubs =
          syncFirstAndLast && preview.length > 1 ? preview.slice(0, -1) : preview;
        const newPoints =
          workingNubs.length === 1 && workingNubs[0]
            ? [workingNubs[0]]
            : getPoints(workingNubs, syncFirstAndLast);
        lineRef.current.points(newPoints.flatMap((p) => [p.x, p.z]));
        lineRef.current.getLayer()?.batchDraw();
      },
      [nubs, syncFirstAndLast],
    );

    /** Called by SplineNub when drag ends — clears preview ref before committing state. */
    const handleNubDragEnd = useCallback(() => {
      previewNubsRef.current = null;
    }, []);

    if (!splinePts) return null;

    return (
      <>
        <Line
          ref={lineRef}
          points={points}
          stroke={selectedSpline === splineIdx ? "red" : "blue"}
          strokeWidth={selectedSpline === splineIdx ? 5 : 2}
          perfectDrawEnabled={false}
          hitStrokeWidth={10}
          draggable
          onDragStart={() => {
            setInitialDragState(
              nubs.map((nub) => ({
                x: nub.x,
                z: nub.z,
              })),
            );
          }}
          onDragMove={() => {
            // No per-frame state updates — Konva handles visuals during drag.
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            const updatedNubs = initialDragState.map((initPos) => ({
              x: initPos.x + dragDx,
              z: initPos.z + dragDz,
            }));

            if (lineRef.current) {
              const rawPts = lineRef.current.points();
              lineRef.current.points(
                rawPts.map((v, i) => (i % 2 === 0 ? v + dragDx : v + dragDz)),
              );
              lineRef.current.x(0);
              lineRef.current.y(0);
              lineRef.current.getLayer()?.batchDraw();
            }

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
          if (nubIdx === 0 && !showFirstNub) return null;
          return (
            <SplineNub
              key={nubIdx}
              nub={nub}
              nubIdx={nubIdx}
              splineIdx={splineIdx}
              setSplineData={setSplineData}
              syncFirstAndLast={syncFirstAndLast}
              onNubPreviewMove={handleNubPreviewMove}
              onNubDragEnd={handleNubDragEnd}
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
    onNubPreviewMove,
    onNubDragEnd,
    onNubChange,
  }: {
    nub: SplineNubType;
    nubIdx: number;
    splineIdx: number;
    setSplineData: Updater<SplineData>;
    syncFirstAndLast: boolean;
    onNubPreviewMove: (nubIdx: number, x: number, z: number) => void;
    onNubDragEnd: () => void;
    onNubChange: () => void;
  }) => {
    const [selectedSpline, setSelectedSpline] = useAtom(SelectedSpline);
    const setActiveView = useSetAtom(ActiveView);
    const setSelectedSplineNub = useSetAtom(SelectedSplineNub);
    const [hovering, setHovering] = useState(false);
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
          onMouseDown={() => {
            setSelectedSpline(splineIdx);
            setActiveView(View.splines);
            setSelectedSplineNub(nubIdx);
          }}
          onDragStart={() => {
            setSelectedSpline(splineIdx);
            setActiveView(View.splines);
            setSelectedSplineNub(nubIdx);
          }}
          onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
            onNubPreviewMove(nubIdx, Math.round(e.target.x()), Math.round(e.target.y()));
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            const newX = Math.round(e.target.x());
            const newZ = Math.round(e.target.y());

            onNubDragEnd();

            setSplineData((draft) => {
              const currentNubs =
                draft.SpNb?.[SPLINE_KEY_BASE + splineIdx]?.obj || [];
              const updatedNubs = [...currentNubs];
              updatedNubs[nubIdx] = { x: newX, z: newZ };

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
