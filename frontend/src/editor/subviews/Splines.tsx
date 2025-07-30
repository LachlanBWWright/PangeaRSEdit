import { SplineData, HeaderData } from "../../python/structSpecs/ottoMaticLevelData";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Spline } from "./splines/Spline";

export function Splines({
  splineData,
  setSplineData,
  headerData,
  setHeaderData,
}: {
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
}) {
  if (!splineData.Spln) return <></>;

  return (
    <Layer>
      {splineData.Spln[1000].obj.map((_, splineIdx) => (
        <Spline
          key={splineIdx}
          splineData={splineData}
          setSplineData={setSplineData}
          splineIdx={splineIdx}
        />
      ))}
    </Layer>
  );
}
