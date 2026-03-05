import { useAtom } from "jotai";
import { Circle, Group, Image as KonvaImage } from "react-konva";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { memo, useRef } from "react";
import { getColour } from "./Fence";

const NUB_RADIUS = 20;

export const FenceNub = memo(
  ({
    nub,
    idx,
    setNub,
    image,
  }: {
    nub: [number, number];
    idx: number;
    setNub: (nub: [number, number]) => void;
    image?: HTMLImageElement | null;
  }) => {
    const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
    const nubRafRef = useRef<number | null>(null);
    const isSelected = idx === selectedFence;
    const color = isSelected ? "red" : getColour(idx);

    return (
      <Group
        x={nub[0]}
        y={nub[1]}
        draggable
        onMouseDown={() => setSelectedFence(idx)}
        onDragStart={() => setSelectedFence(idx)}
        onDragMove={(e) => {
          const newX = Math.round(e.target.x());
          const newY = Math.round(e.target.y());
          if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
          nubRafRef.current = requestAnimationFrame(() => {
            setNub([newX, newY]);
          });
        }}
        onDragEnd={(e) => {
          if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
          setNub([Math.round(e.target.x()), Math.round(e.target.y())]);
        }}
      >
        {/* Black background circle — always visible behind image or solid fill */}
        <Circle radius={NUB_RADIUS} fill="black" listening={false} />

        {/* Solid fill when no image */}
        {!image && <Circle radius={NUB_RADIUS} fill={color} />}

        {/* Fence image clipped to circle */}
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

        {/* Colored border — serves as the hit area for click/drag; must be listening */}
        <Circle
          radius={NUB_RADIUS}
          fill="transparent"
          stroke={color}
          strokeWidth={isSelected ? 4 : 2}
        />
      </Group>
    );
  },
);
