import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { MightyMikeItem } from "./items/MightyMikeItem";
import { memo, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectItems } from "../../data/selectors";
import { ActiveHoverTag } from "@/data/globals/hoverTagAtom";
import { SelectedItem } from "@/data/items/itemAtoms";

export const MightyMikeItems = memo(
  ({
    itemData,
    setItemData,
  }: {
    itemData: ItemData;
    setItemData: Updater<ItemData>;
  }) => {
    const items = selectItems({ Itms: itemData.Itms });
    const setActiveHoverTag = useSetAtom(ActiveHoverTag);
    const selectedItem = useAtomValue(SelectedItem);

    // Clear the hover tag when this layer unmounts (e.g. view switch).
    useEffect(() => {
      return () => setActiveHoverTag(null);
    }, [setActiveHoverTag]);

    if (items.length === 0) return <></>;

    return (
      <Layer>
        <Rect />
        {items.map((_, itemIdx) => (
          <MightyMikeItem
            key={itemIdx}
            itemData={itemData}
            setItemData={setItemData}
            itemIdx={itemIdx}
            selected={selectedItem === itemIdx}
            onHoverChange={setActiveHoverTag}
          />
        ))}
      </Layer>
    );
  },
);
