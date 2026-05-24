import { SplineData } from "@/python/structSpecs/LevelTypes";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Spline } from "./splines/Spline";
import { memo, useEffect } from "react";
import { useSetAtom } from "jotai";
import { ActiveHoverTag } from "@/data/globals/hoverTagAtom";

export const Splines = memo(function Splines({
  splineData,
  setSplineData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
}) {
  const setActiveHoverTag = useSetAtom(ActiveHoverTag);

  // Clear the hover tag when this layer unmounts (e.g. view switch).
  useEffect(() => {
    return () => setActiveHoverTag(null);
  }, [setActiveHoverTag]);

  if (!splineData.Spln) return <></>;

  return (
    <Layer>
      {splineData.Spln[1000].obj.map((_, splineIdx) => (
        <Spline
          key={splineIdx}
          splineData={splineData}
          setSplineData={setSplineData}
          splineIdx={splineIdx}
          onHoverChange={setActiveHoverTag}
        />
      ))}
    </Layer>
  );
});
