import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Fence } from "./fences/Fence";
import { useAtomValue } from "jotai";
import { SelectedFence } from "@/data/fences/fenceAtoms";

export function Fences({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  const selectedFence = useAtomValue(SelectedFence);
  if (!data.Fenc) return <></>;

  return (
    <Layer>
      {data.Fenc[1000].obj.map((_, fenceIdx) => {
        if (selectedFence === fenceIdx) return;

        return (
          <Fence
            key={fenceIdx}
            data={data}
            setData={setData}
            fenceIdx={fenceIdx}
          />
        );
      })}
      {selectedFence !== undefined && (
        <Fence data={data} setData={setData} fenceIdx={selectedFence} />
      )}
    </Layer>
  );
}
