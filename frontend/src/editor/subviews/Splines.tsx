import { SplineData } from "@/python/structSpecs/LevelTypes";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Spline } from "./splines/Spline";
import { memo, useState, useCallback } from "react";
import { HoverNameTag } from "./shared/nodeVisuals";
import type { HoverTagInfo } from "./shared/nodeVisuals";

export const Splines = memo(function Splines({
  splineData,
  setSplineData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
}) {
  const [hoveredTag, setHoveredTag] = useState<HoverTagInfo | null>(null);

  const handleHoverChange = useCallback((tag: HoverTagInfo | null) => {
    setHoveredTag(tag);
  }, []);

  if (!splineData.Spln) return <></>;

  return (
    <Layer>
      {splineData.Spln[1000].obj.map((_, splineIdx) => (
        <Spline
          key={splineIdx}
          splineData={splineData}
          setSplineData={setSplineData}
          splineIdx={splineIdx}
          onHoverChange={handleHoverChange}
        />
      ))}
      {/* Render hover tag last so it always appears above all spline items */}
      {hoveredTag && (
        <HoverNameTag
          x={hoveredTag.x}
          y={hoveredTag.y}
          text={hoveredTag.text}
          fill={hoveredTag.fill}
          textColor={hoveredTag.textColor}
        />
      )}
    </Layer>
  );
});
