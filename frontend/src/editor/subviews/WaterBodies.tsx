import { LiquidData } from "../../python/structSpecs/ottoMaticLevelData";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { WaterBody } from "./water/WaterBody";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { useAtomValue } from "jotai";
import { selectLiquids } from "../../data/selectors";

export function WaterBodies({
  liquidData,
  setLiquidData,
}: {
  liquidData: LiquidData;
  setLiquidData: Updater<LiquidData>;
}) {
  const selectedWaterBody = useAtomValue(SelectedWaterBody);
  const liquids = selectLiquids({ Liqd: liquidData.Liqd });
  
  if (liquids.length === 0) return <></>;

  return (
    <Layer>
      {liquids.map((_, waterIdx) => {
        if (selectedWaterBody === waterIdx) return;
        return (
          <WaterBody
            liquidData={liquidData}
            setLiquidData={setLiquidData}
            key={waterIdx}
            waterBodyIdx={waterIdx}
          />
        );
      })}
      {selectedWaterBody !== null && (
        <WaterBody
          liquidData={liquidData}
          setLiquidData={setLiquidData}
          key={selectedWaterBody}
          waterBodyIdx={selectedWaterBody}
        />
      )}
    </Layer>
  );
}
