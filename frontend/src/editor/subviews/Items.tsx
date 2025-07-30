import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";
import { memo } from "react";
import { selectItems } from "../../data/selectors";

export const Items = memo(
  ({
    data,
    setData,
  }: {
    data: ottoMaticLevel;
    setData: Updater<ottoMaticLevel>;
  }) => {
    const items = selectItems(data);
    
    if (items.length === 0) return <></>;

    return (
      <Layer>
        <Rect />
        {items.map((_, itemIdx) => (
          <Item key={itemIdx} data={data} setData={setData} itemIdx={itemIdx} />
        ))}
      </Layer>
    );
  },
);
