import { Updater } from "use-immer";
import { FenceData } from "@/python/structSpecs/LevelTypes";
import { Circle, Group, Line, Text } from "react-konva";
import Konva from "konva";
import { FenceNub } from "./FenceNub";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom, useAtomValue } from "jotai";
import { memo, useCallback, useEffect, useState } from "react";
import { Globals } from "@/data/globals/globals";
import { getFenceImagePath } from "@/data/fences/getFenceImagePath";

const NUB_KEY_BASE = 1000;
const MIN_NUBS = 2;

/** Loads an HTMLImageElement from a URL, returning null until ready. */
function useFenceImage(src: string | null) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) return;
    const el = new window.Image();
    el.onload = () => setImg(el);
    el.onerror = () => setImg(null);
    el.src = src;
    return () => {
      // Clear the image when src changes or component unmounts
      setImg(null);
    };
  }, [src]);
  return img;
}

/**
 * Small icon button rendered in Konva (a coloured circle + symbol text).
 * Calls onClick when pressed.
 */
function KonvaIconButton({
  x, y, label, bgColor, onClick,
}: {
  x: number; y: number; label: string; bgColor: string;
  onClick: () => void;
}) {
  const R = 12;
  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick} listening>
      <Circle radius={R} fill={bgColor} stroke="#fff" strokeWidth={1} />
      <Text
        text={label}
        fontSize={14}
        fontStyle="bold"
        fill="#fff"
        align="center"
        verticalAlign="middle"
        x={-R}
        y={-R}
        width={R * 2}
        height={R * 2}
        listening={false}
      />
    </Group>
  );
}

export const Fence = memo(
  ({
    fenceData,
    setFenceData,
    fenceIdx,
  }: {
    fenceData: FenceData;
    setFenceData: Updater<FenceData>;
    fenceIdx: number;
  }) => {
    const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
    const globals = useAtomValue(Globals);
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);
    const [previewNubs, setPreviewNubs] = useState<[number, number][] | null>(null);

    const fenceNubs = fenceData.FnNb[NUB_KEY_BASE + fenceIdx]?.obj ?? null;
    const fenceObj = fenceNubs ? fenceData.Fenc[1000].obj[fenceIdx] : undefined;

    // All hooks must be called before early returns
    const isSelected = fenceIdx === selectedFence;
    const color = isSelected ? "red" : getColour(fenceIdx);
    const imageSrc = fenceNubs ? getFenceImagePath(globals, fenceObj?.fenceType ?? 0) : null;
    const fenceImage = useFenceImage(imageSrc || null);

    if (!fenceNubs) return null;

    const numNubs = fenceObj?.numNubs ?? fenceNubs.length;
    const displayNubs =
      previewNubs && previewNubs.length === fenceNubs.length
        ? previewNubs
        : fenceNubs;
    const lines = displayNubs.flatMap((nub) => [nub[0], nub[1]]);

    // Stable callbacks so FenceNub memo is not defeated on every preview update
    const handlePreviewNub = useCallback(
      (nubIdx: number, newNub: [number, number]) => {
        setPreviewNubs((current) => {
          const next = [...(current ?? fenceNubs)];
          next[nubIdx] = newNub;
          return next;
        });
      },
      [fenceNubs],
    );

    const handleSetNub = useCallback(
      (nubIdx: number, newNub: [number, number]) => {
        setPreviewNubs(null);
        setFenceData((data) => {
          const nubData = data.FnNb[NUB_KEY_BASE + fenceIdx]?.obj;
          if (nubData && nubData[nubIdx]) {
            nubData[nubIdx] = newNub;
          }
        });
      },
      [fenceIdx, setFenceData],
    );

    // --- Nub add/remove handlers ---
    const handleAddFront = () => {
      setFenceData((data) => {
        const fence = data.Fenc[1000].obj[fenceIdx];
        if (!fence) return;
        fence.numNubs++;
        const nubList = data.FnNb[NUB_KEY_BASE + fenceIdx];
        if (!nubList?.obj) return;
        const firstNub = nubList.obj[0];
        if (!firstNub) return;
        nubList.obj.unshift([firstNub[0] - 50, firstNub[1] - 50]);
      });
    };

    const handleAddBack = () => {
      setFenceData((data) => {
        const fence = data.Fenc[1000].obj[fenceIdx];
        if (!fence) return;
        fence.numNubs++;
        const nubList = data.FnNb[NUB_KEY_BASE + fenceIdx];
        if (!nubList?.obj) return;
        const lastNub = nubList.obj[nubList.obj.length - 1];
        if (!lastNub) return;
        nubList.obj.push([lastNub[0] + 50, lastNub[1] + 50]);
      });
    };

    const handleRemoveFront = () => {
      setFenceData((data) => {
        const fence = data.Fenc[1000].obj[fenceIdx];
        if (!fence || fence.numNubs <= MIN_NUBS) return;
        fence.numNubs--;
        data.FnNb[NUB_KEY_BASE + fenceIdx]?.obj.shift();
      });
    };

    const handleRemoveBack = () => {
      setFenceData((data) => {
        const fence = data.Fenc[1000].obj[fenceIdx];
        if (!fence || fence.numNubs <= MIN_NUBS) return;
        fence.numNubs--;
        data.FnNb[NUB_KEY_BASE + fenceIdx]?.obj.pop();
      });
    };

    const firstNub = displayNubs[0];
    const lastNub = displayNubs[displayNubs.length - 1];

    // Offset for add/remove buttons — placed outside the nub radius
    const BTN_OFFSET = 36;

    return (
      <>
        <Line
          points={lines}
          stroke={color}
          strokeWidth={isSelected ? 4 : 2}
          perfectDrawEnabled={false}
          onClick={() => setSelectedFence(fenceIdx)}
          draggable
          onDragStart={() => {
            const nubData = fenceData.FnNb[NUB_KEY_BASE + fenceIdx]?.obj;
            if (nubData) {
              setInitialDragState(nubData.map((nub) => [nub[0], nub[1]]));
            }
            setSelectedFence(fenceIdx);
          }}
          onDragMove={() => {
            // Visual transform handled by Konva
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            if (!initialDragState) return;
            const dragDx = e.target.x();
            const dragDz = e.target.y();
            setFenceData((draft) => {
              const currentNubs = draft.FnNb[NUB_KEY_BASE + fenceIdx]?.obj;
              if (!currentNubs) return;
              for (let i = 0; i < currentNubs.length; i++) {
                const nub = currentNubs[i];
                const initial = initialDragState[i];
                if (nub && initial) {
                  nub[0] = initial[0] + dragDx;
                  nub[1] = initial[1] + dragDz;
                }
              }
            });
            e.target.x(0);
            e.target.y(0);
            setInitialDragState(null);
            setPreviewNubs(null);
          }}
        />

        {displayNubs.map((nub, nubIdx) => (
          <FenceNub
            key={nubIdx}
            idx={fenceIdx}
            nubIdx={nubIdx}
            nub={nub}
            image={fenceImage}
            onPreviewNub={handlePreviewNub}
            setNub={handleSetNub}
          />
        ))}

        {/* Nub add/remove icons when this fence is selected */}
        {isSelected && firstNub && (
          <>
            {/* Connecting line: add-front button → first nub */}
            <Line
              points={[firstNub[0] - BTN_OFFSET, firstNub[1] - BTN_OFFSET, firstNub[0], firstNub[1]]}
              stroke="#22c55e"
              strokeWidth={1.5}
              dash={[4, 3]}
              listening={false}
              opacity={0.7}
            />
            <KonvaIconButton
              x={firstNub[0] - BTN_OFFSET}
              y={firstNub[1] - BTN_OFFSET}
              label="+"
              bgColor="#22c55e"
              onClick={handleAddFront}
            />
            {numNubs > MIN_NUBS && (
              <>
                {/* Connecting line: remove-front button → first nub */}
                <Line
                  points={[firstNub[0] + BTN_OFFSET, firstNub[1] - BTN_OFFSET, firstNub[0], firstNub[1]]}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dash={[4, 3]}
                  listening={false}
                  opacity={0.7}
                />
                <KonvaIconButton
                  x={firstNub[0] + BTN_OFFSET}
                  y={firstNub[1] - BTN_OFFSET}
                  label="×"
                  bgColor="#ef4444"
                  onClick={handleRemoveFront}
                />
              </>
            )}
          </>
        )}
        {isSelected && lastNub && firstNub !== lastNub && (
          <>
            {/* Connecting line: add-back button → last nub */}
            <Line
              points={[lastNub[0] + BTN_OFFSET, lastNub[1] + BTN_OFFSET, lastNub[0], lastNub[1]]}
              stroke="#22c55e"
              strokeWidth={1.5}
              dash={[4, 3]}
              listening={false}
              opacity={0.7}
            />
            <KonvaIconButton
              x={lastNub[0] + BTN_OFFSET}
              y={lastNub[1] + BTN_OFFSET}
              label="+"
              bgColor="#22c55e"
              onClick={handleAddBack}
            />
            {numNubs > MIN_NUBS && (
              <>
                {/* Connecting line: remove-back button → last nub */}
                <Line
                  points={[lastNub[0] - BTN_OFFSET, lastNub[1] + BTN_OFFSET, lastNub[0], lastNub[1]]}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dash={[4, 3]}
                  listening={false}
                  opacity={0.7}
                />
                <KonvaIconButton
                  x={lastNub[0] - BTN_OFFSET}
                  y={lastNub[1] + BTN_OFFSET}
                  label="×"
                  bgColor="#ef4444"
                  onClick={handleRemoveBack}
                />
              </>
            )}
          </>
        )}
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
