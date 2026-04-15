import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { MightyMikeItem } from "./items/MightyMikeItem";
import { memo, useState, useCallback } from "react";
import { selectItems } from "../../data/selectors";
import { HoverNameTag } from "./shared/nodeVisuals";
import type { HoverTagInfo } from "./shared/nodeVisuals";

export const MightyMikeItems = memo(
  ({
    itemData,
    setItemData,
  }: {
    itemData: ItemData;
    setItemData: Updater<ItemData>;
  }) => {
    const items = selectItems({ Itms: itemData.Itms });
    const [hoveredTag, setHoveredTag] = useState<HoverTagInfo | null>(null);

    const handleHoverChange = useCallback((tag: HoverTagInfo | null) => {
      setHoveredTag(tag);
    }, []);

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
            onHoverChange={handleHoverChange}
          />
        ))}
        {/* Render hover tag last so it always appears above all items */}
        {hoveredTag && (
          <HoverNameTag
            x={hoveredTag.x}
            y={hoveredTag.y}
            text={hoveredTag.text}
            fill={hoveredTag.fill}
            textColor={hoveredTag.textColor}
          />
        )}
      </Layer>
    );
  },
);
