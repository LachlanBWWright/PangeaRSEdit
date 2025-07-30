import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { WaterBody } from "./water/WaterBody";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { useAtomValue } from "jotai";
import { selectLiquids } from "../../data/selectors";

export function WaterBodies({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const selectedWaterBody = useAtomValue(SelectedWaterBody);
  const liquids = selectLiquids(data);
  
  if (liquids.length === 0) return <></>;

  return (
    <Layer>
      {liquids.map((_, waterIdx) => {
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
      {selectedWaterBody !== null && (
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
