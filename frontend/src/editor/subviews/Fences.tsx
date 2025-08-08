import { FenceData } from "../../python/structSpecs/ottoMaticLevelData";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Fence } from "./fences/Fence";
import { useAtomValue } from "jotai";
import { SelectedFence } from "@/data/fences/fenceAtoms";

export function Fences({
  fenceData,
  setFenceData,
}: {
  fenceData: FenceData;
  setFenceData: Updater<FenceData>;
}) {
  const selectedFence = useAtomValue(SelectedFence);
  if (!fenceData.Fenc) return <></>;

  return (
    <Layer>
      {fenceData.Fenc[1000].obj.map((_, fenceIdx) => {
        if (selectedFence === fenceIdx) return;

        return (
          <Fence
            key={fenceIdx}
            fenceData={fenceData}
            setFenceData={setFenceData}
            fenceIdx={fenceIdx}
          />
        );
      })}
      {selectedFence !== undefined && (
        <Fence fenceData={fenceData} setFenceData={setFenceData} fenceIdx={selectedFence} />
      )}
    </Layer>
  );
}
