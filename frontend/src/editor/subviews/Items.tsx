import { ItemData, HeaderData } from "../../python/structSpecs/ottoMaticLevelData";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";
import { memo } from "react";
import { selectItems } from "../../data/selectors";

export const Items = memo(
  ({
    itemData,
    setItemData,
    headerData,
    setHeaderData,
  }: {
    itemData: ItemData;
    setItemData: Updater<ItemData>;
    headerData: HeaderData;
    setHeaderData: Updater<HeaderData>;
  }) => {
    const items = selectItems({ Itms: itemData.Itms });
    
    if (items.length === 0) return <></>;

    return (
      <Layer>
        <Rect />
        {items.map((_, itemIdx) => (
          <Item key={itemIdx} itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} itemIdx={itemIdx} />
        ))}
      </Layer>
    );
  },
);
