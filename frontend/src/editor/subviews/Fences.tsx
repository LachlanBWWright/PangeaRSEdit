import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { Fence } from "./fences/Fence";

export function Fences({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  if (!data.Fenc) return <></>;

  return (
    <Layer>
      {data.Fenc[1000].obj.map((_, fenceIdx) => (
        <Fence
          key={fenceIdx}
          data={data}
          setData={setData}
          fenceIdx={fenceIdx}
        />
      ))}
    </Layer>
  );
}
