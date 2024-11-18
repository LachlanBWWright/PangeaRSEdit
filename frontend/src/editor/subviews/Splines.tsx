import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Spline } from "./splines/Spline";

export function Splines({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  if (!data.Spln) return <></>;

  return (
    <Layer>
      {data.Spln[1000].obj.map((_, splineIdx) => (
        <Spline
          key={splineIdx}
          data={data}
          setData={setData}
          splineIdx={splineIdx}
        />
      ))}
    </Layer>
  );
}
