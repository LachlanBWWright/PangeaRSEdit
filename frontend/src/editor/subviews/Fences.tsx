import { FenceData, LiquidData } from "@/python/structSpecs/LevelTypes";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Fence } from "./fences/Fence";
import { useAtomValue } from "jotai";
import { SelectedFence } from "@/data/fences/fenceAtoms";
import { memo } from "react";

export const Fences = memo(function Fences({
  fenceData,
  setFenceData,
  liquidData = null,
}: {
  fenceData: FenceData;
  setFenceData: Updater<FenceData>;
  liquidData?: LiquidData | null;
}) {
  const selectedFence = useAtomValue(SelectedFence);
  if (!fenceData.Fenc) return <></>;

  return (
    <Layer>
      {fenceData.Fenc[1000].obj.map((_, fenceIdx) => {
        if (selectedFence === fenceIdx) return null;

        return (
          <Fence
            key={fenceIdx}
            fenceData={fenceData}
            setFenceData={setFenceData}
            fenceIdx={fenceIdx}
            liquidData={liquidData}
          />
        );
      })}
      {selectedFence !== undefined && (
        <Fence fenceData={fenceData} setFenceData={setFenceData} fenceIdx={selectedFence} liquidData={liquidData} />
      )}
    </Layer>
  );
});
