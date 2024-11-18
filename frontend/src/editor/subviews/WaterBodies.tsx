import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { WaterBody } from "./water/WaterBody";

export function WaterBodies({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  if (!data.Liqd) return <></>;

  return (
    <Layer>
      {data.Liqd[1000].obj.map((_, waterIdx) => (
        <WaterBody data={data} setData={setData} waterBodyIdx={waterIdx} />
      ))}
    </Layer>
  );
}
