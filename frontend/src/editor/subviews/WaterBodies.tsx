import { LiquidData } from "@/python/structSpecs/LevelTypes";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { WaterBody } from "./water/WaterBody";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { useAtomValue } from "jotai";
import { memo } from "react";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";

export const WaterBodies = memo(function WaterBodies({
  headerData,
  terrainData,
  liquidData,
  setLiquidData,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  liquidData: LiquidData;
  setLiquidData: Updater<LiquidData>;
}) {
  const selectedWaterBody = useAtomValue(SelectedWaterBody);
  if (!liquidData.Liqd) return <></>;

  return (
    <Layer>
      {liquidData.Liqd[1000].obj.map((_, waterIdx) => {
        if (selectedWaterBody === waterIdx) return null;
        return (
          <WaterBody
            headerData={headerData}
            terrainData={terrainData}
            liquidData={liquidData}
            setLiquidData={setLiquidData}
            key={waterIdx}
            waterBodyIdx={waterIdx}
          />
        );
      })}
      {selectedWaterBody !== null && (
        <WaterBody
          headerData={headerData}
          terrainData={terrainData}
          liquidData={liquidData}
          setLiquidData={setLiquidData}
          key={selectedWaterBody}
          waterBodyIdx={selectedWaterBody}
        />
      )}
    </Layer>
  );
});
