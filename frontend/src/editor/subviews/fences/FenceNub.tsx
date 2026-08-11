import { useAtom, useSetAtom } from "jotai";
import { Circle, Group, Image as KonvaImage } from "react-konva";
import {
  SelectedFence,
  SelectedFenceNub,
} from "../../../data/fences/fenceAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { memo, useRef } from "react";
import type { CanvasPoint } from "../shared/nubSnapping";
import { snapCanvasPoint } from "../shared/nubSnapping";
import {
  commitFenceNubDrag,
  previewFenceNubDrag,
  selectFenceNub,
} from "@/editor/subviews/fences/fenceNubInteractions";

const NUB_RADIUS = 10;

export const FenceNub = memo(
  ({
    nub,
    idx,
    nubIdx,
    borderColor,
    onPreviewNub,
    setNub,
    image,
    snappingEnabled,
    snapTargets,
  }: {
    nub: [number, number];
    idx: number;
    nubIdx: number;
    borderColor: string;
    onPreviewNub: (nubIdx: number, nub: [number, number]) => void;
    setNub: (nubIdx: number, nub: [number, number]) => void;
    image?: HTMLImageElement | null;
    snappingEnabled: boolean;
    snapTargets: readonly CanvasPoint[];
  }) => {
    const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
    const setActiveView = useSetAtom(ActiveView);
    const setSelectedFenceNub = useSetAtom(SelectedFenceNub);
    const nubRafRef = useRef<number | null>(null);
    const isSelected = idx === selectedFence;
    const color = isSelected ? "red" : borderColor;

    const handleSelectNub = () => {
      selectFenceNub({
        setSelectedFence,
        setActiveView,
        setSelectedFenceNub,
        fenceIndex: idx,
        nubIndex: nubIdx,
      });
    };

    return (
      <Group
        x={nub[0]}
        y={nub[1]}
        draggable
        onMouseDown={handleSelectNub}
        onDragStart={handleSelectNub}
        onDragMove={(event) => {
          if (snappingEnabled) {
            const snapped = snapCanvasPoint(
              [event.target.x(), event.target.y()],
              snapTargets,
              event.target.getStage(),
            );
            event.target.position({ x: snapped[0], y: snapped[1] });
          }
          previewFenceNubDrag({
            event,
            nubIndex: nubIdx,
            rafRef: nubRafRef,
            onPreviewNub,
          });
        }}
        onDragEnd={(event) => {
          if (snappingEnabled) {
            const snapped = snapCanvasPoint(
              [event.target.x(), event.target.y()],
              snapTargets,
              event.target.getStage(),
            );
            event.target.position({ x: snapped[0], y: snapped[1] });
          }
          commitFenceNubDrag({
            event,
            nubIndex: nubIdx,
            rafRef: nubRafRef,
            setNub,
          });
        }}
      >
        <Circle
          radius={NUB_RADIUS}
          fill="black"
          listening={false}
          perfectDrawEnabled={false}
        />

        {!image && (
          <Circle radius={NUB_RADIUS} fill={color} perfectDrawEnabled={false} />
        )}

        {image && (
          <Group
            clipFunc={(ctx) => {
              ctx.arc(0, 0, NUB_RADIUS, 0, Math.PI * 2, false);
            }}
            listening={false}
          >
            <KonvaImage
              image={image}
              x={-NUB_RADIUS}
              y={-NUB_RADIUS}
              width={NUB_RADIUS * 2}
              height={NUB_RADIUS * 2}
            />
          </Group>
        )}

        <Circle
          radius={NUB_RADIUS}
          fill="transparent"
          stroke={color}
          strokeWidth={isSelected ? 4 : 2}
          perfectDrawEnabled={false}
        />
      </Group>
    );
  },
);
