import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { WaterBody } from "./water/WaterBody";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { useAtomValue } from "jotai";

export function WaterBodies({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const selectedWaterBody = useAtomValue(SelectedWaterBody);
  if (!data.Liqd) return <></>;

  return (
    <Layer>
      {data.Liqd[1000].obj.map((_, waterIdx) => {
        if (selectedWaterBody === waterIdx) return;
        return (
          <WaterBody
            data={data}
            setData={setData}
            key={waterIdx}
            waterBodyIdx={waterIdx}
          />
        );
      })}
      {selectedWaterBody !== undefined && (
        <WaterBody
          data={data}
          setData={setData}
          key={selectedWaterBody}
          waterBodyIdx={selectedWaterBody}
        />
      )}
    </Layer>
  );
}
