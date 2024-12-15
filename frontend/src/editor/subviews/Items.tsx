import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";

export function Items({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
  if (!data.Itms) return <></>;

  return (
    <Layer>
      <Rect />
      {data.Itms[1000].obj.map((_, itemIdx) => (
        <Item key={itemIdx} data={data} setData={setData} itemIdx={itemIdx} />
      ))}
    </Layer>
  );
}
