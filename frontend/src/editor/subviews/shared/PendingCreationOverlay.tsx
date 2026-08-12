import { useAtomValue } from "jotai";
import { PendingCreation } from "@/data/creation/pendingCreationAtom";
import { Layer, Line, Circle, Text, Group } from "react-konva";
import { useEffect, useRef, useState, memo } from "react";
import type Konva from "konva";

interface Point {
  x: number;
  y: number;
}

export const PendingCreationOverlay = memo(function PendingCreationOverlay() {
  const pendingCreation = useAtomValue(PendingCreation);
  const [pointerPos, setPointerPos] = useState<Point | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  useEffect(() => {
    if (!pendingCreation) {
      setPointerPos(null);
      return;
    }

    const layer = layerRef.current;
    if (!layer) return;
    const stage = layer.getStage();
    if (!stage) return;

    const handleMouseMove = () => {
      const pos = stage.getRelativePointerPosition();
      if (pos) {
        setPointerPos({ x: Math.round(pos.x), y: Math.round(pos.y) });
      }
    };

    const handleMouseLeave = () => {
      setPointerPos(null);
    };

    stage.on("mousemove", handleMouseMove);
    stage.on("mouseleave", handleMouseLeave);

    // Initial position
    const initialPos = stage.getRelativePointerPosition();
    if (initialPos) {
      setPointerPos({ x: Math.round(initialPos.x), y: Math.round(initialPos.y) });
    }

    return () => {
      stage.off("mousemove", handleMouseMove);
      stage.off("mouseleave", handleMouseLeave);
    };
  }, [pendingCreation]);

  if (!pendingCreation) return null;

  const { kind, points } = pendingCreation;

  // Determine theme colors based on the creation kind
  let themeColor = "#f97316"; // default orange for fence
  if (kind === "water") {
    themeColor = "#0ea5e9"; // cyan/blue for water
  } else if (kind === "spline") {
    themeColor = "#d946ef"; // purple/pink for spline
  }

  const hasPoints = points.length > 0;
  const showFill = kind === "water" && points.length >= 2;

  // Build the list of confirmed points for the main line
  const mainLinePoints = points.flatMap((p) => [p.x, p.z]);

  // For water bodies, we want to preview the closed polygon including the current cursor position
  let waterFillPoints: number[] = [];
  if (kind === "water" && hasPoints && pointerPos) {
    waterFillPoints = [...mainLinePoints, pointerPos.x, pointerPos.y];
  }

  return (
    <Layer ref={layerRef}>
      {/* 1. Filled region for water body */}
      {showFill && pointerPos && (
        <Line
          points={waterFillPoints}
          closed
          fill="rgba(14, 165, 233, 0.15)"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* 2. Main line connecting confirmed points */}
      {points.length >= 2 && (
        <Line
          points={mainLinePoints}
          stroke={themeColor}
          strokeWidth={3}
          dash={kind === "water" ? undefined : [6, 4]}
          closed={kind === "water" && !pointerPos} // close if no mouse pointer (e.g. touch/mobile not hovering)
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* 3. Dashed line from last point to cursor */}
      {hasPoints && pointerPos && (
        <Line
          points={[
            points.at(-1)?.x ?? pointerPos.x,
            points.at(-1)?.z ?? pointerPos.y,
            pointerPos.x,
            pointerPos.y,
          ]}
          stroke={themeColor}
          strokeWidth={2}
          dash={[4, 4]}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* 4. For water bodies, dashed line from cursor back to first point to show closure */}
      {kind === "water" && points.length >= 2 && pointerPos && (
        <Line
          points={[
            pointerPos.x,
            pointerPos.y,
            points[0]?.x ?? pointerPos.x,
            points[0]?.z ?? pointerPos.y,
          ]}
          stroke={themeColor}
          strokeWidth={2}
          dash={[4, 4]}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* 5. Confirmed points (nubs) */}
      {points.map((p, index) => {
        const isLast = index === points.length - 1;
        return (
          <Group key={index} listening={false}>
            <Circle
              x={p.x}
              y={p.z}
              radius={isLast ? 7 : 5.5}
              fill={themeColor}
              stroke="white"
              strokeWidth={2}
              shadowColor="black"
              shadowBlur={3}
              shadowOpacity={0.4}
              shadowOffset={{ x: 1, y: 1 }}
              perfectDrawEnabled={false}
            />
            <Text
              x={p.x + 8}
              y={p.z - 12}
              text={(index + 1).toString()}
              fontSize={10}
              fontStyle="bold"
              fill="white"
              stroke="black"
              strokeWidth={2}
              perfectDrawEnabled={false}
            />
          </Group>
        );
      })}

      {/* 6. Mouse follower preview nub */}
      {pointerPos && (
        <Circle
          x={pointerPos.x}
          y={pointerPos.y}
          radius={5}
          fill={themeColor}
          opacity={0.6}
          stroke="white"
          strokeWidth={1.5}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Layer>
  );
});
