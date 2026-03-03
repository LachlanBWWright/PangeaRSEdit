import { Updater } from "use-immer";
import { FenceData } from "@/python/structSpecs/LevelTypes";
import { Circle, Group, Image as KonvaImage, Line, Text } from "react-konva";
import Konva from "konva";
import { FenceNub } from "./FenceNub";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom, useAtomValue } from "jotai";
import { memo, useEffect, useState } from "react";
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

    const fenceNubs = fenceData.FnNb[NUB_KEY_BASE + fenceIdx]?.obj ?? null;
    const fenceObj = fenceNubs ? fenceData.Fenc[1000].obj[fenceIdx] : undefined;

    // All hooks must be called before early returns
    const isSelected = fenceIdx === selectedFence;
    const color = isSelected ? "red" : getColour(fenceIdx);
    const imageSrc = fenceNubs ? getFenceImagePath(globals, fenceObj?.fenceType ?? 0) : null;
    const fenceImage = useFenceImage(imageSrc || null);

    if (!fenceNubs) return null;

    const numNubs = fenceObj?.numNubs ?? fenceNubs.length;
    const lines = fenceNubs.flatMap((nub) => [nub[0], nub[1]]);

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

    const firstNub = fenceNubs[0];
    const lastNub = fenceNubs[fenceNubs.length - 1];

    return (
      <>
        {/* Fence image tiles drawn along each segment */}
        {fenceImage && fenceNubs.length >= 2 &&
          fenceNubs.slice(0, -1).map((nub, i) => {
            const next = fenceNubs[i + 1];
            if (!next) return null;
            const dx = next[0] - nub[0];
            const dy = next[1] - nub[1];
            const len = Math.hypot(dx, dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const imgH = 20;
            return (
              <KonvaImage
                key={`img-${i}`}
                image={fenceImage}
                x={nub[0]}
                y={nub[1] - imgH / 2}
                width={len}
                height={imgH}
                rotation={angle}
                listening={false}
                opacity={0.85}
              />
            );
          })}

        <Line
          points={lines}
          stroke={color}
          strokeWidth={isSelected ? 4 : 2}
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
          }}
        />

        {fenceNubs.map((nub, nubIdx) => (
          <FenceNub
            key={nubIdx}
            idx={fenceIdx}
            nub={nub}
            setNub={(newNub: [number, number]) => {
              setFenceData((fenceData) => {
                const nubData = fenceData.FnNb[NUB_KEY_BASE + fenceIdx]?.obj;
                if (nubData && nubData[nubIdx]) {
                  nubData[nubIdx] = newNub;
                }
              });
            }}
          />
        ))}

        {/* Nub add/remove icons when this fence is selected */}
        {isSelected && firstNub && (
          <>
            {/* Add at front */}
            <KonvaIconButton
              x={firstNub[0] - 30}
              y={firstNub[1] - 30}
              label="+"
              bgColor="#22c55e"
              onClick={handleAddFront}
            />
            {/* Remove front nub — only shown when more than minimum */}
            {numNubs > MIN_NUBS && (
              <KonvaIconButton
                x={firstNub[0] + 30}
                y={firstNub[1] - 30}
                label="×"
                bgColor="#ef4444"
                onClick={handleRemoveFront}
              />
            )}
          </>
        )}
        {isSelected && lastNub && firstNub !== lastNub && (
          <>
            {/* Add at back */}
            <KonvaIconButton
              x={lastNub[0] + 30}
              y={lastNub[1] + 30}
              label="+"
              bgColor="#22c55e"
              onClick={handleAddBack}
            />
            {/* Remove back nub — only shown when more than minimum */}
            {numNubs > MIN_NUBS && (
              <KonvaIconButton
                x={lastNub[0] - 30}
                y={lastNub[1] + 30}
                label="×"
                bgColor="#ef4444"
                onClick={handleRemoveBack}
              />
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
