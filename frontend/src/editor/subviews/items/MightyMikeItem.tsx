import { Updater } from "use-immer";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Rect, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, useCallback, memo, useEffect, useMemo } from "react";
import { Globals } from "@/data/globals/globals";
import { getItemName } from "@/data/items/getItemNames";
import { selectItem, updateItem } from "../../../data/selectors";
import { ShowMightyMikeItemImages } from "./MightyMikeItemMenu";
import { loadItemImage, type ItemFrameImage } from "@/utils/mightyMikeShapeImageLoader";
import { CurrentScene } from "@/data/game/gameAtoms";
import { isOk } from "@/types/result";
import {
  HoverNameTag,
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ITEM_TAG_GAP,
  ItemTypeNumber,
} from "../shared/nodeVisuals";

export const MightyMikeItem = memo(function MightyMikeItem({
  itemData,
  setItemData,
  itemIdx,
}: {
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  itemIdx: number;
}) {
  const setSelectedItem = useSetAtom(SelectedItem);
  const item = useMemo(
    () => selectItem({ Itms: itemData.Itms }, itemIdx),
    [itemData.Itms, itemIdx]
  );
  const [hovering, setHovering] = useState(false);
  const globals = useAtomValue(Globals);
  const showItemImages = useAtomValue(ShowMightyMikeItemImages);
  const currentScene = useAtomValue(CurrentScene);
  const [itemImageData, setItemImageData] = useState<ItemFrameImage | null>(null);

  const handleMouseOver = useCallback(() => setHovering(true), []);
  const handleMouseLeave = useCallback(() => setHovering(false), []);
  const handleMouseDown = useCallback(
    () => setSelectedItem(itemIdx),
    [itemIdx, setSelectedItem],
  );
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Apply the sprite's frame offset to map canvas top-left back to item world position.
      // offsetX/offsetY are the sprite hot-spot offsets from the game's FrameHeader.
      const ox = itemImageData ? itemImageData.offsetX : -ITEM_BOX_OFFSET;
      const oy = itemImageData ? itemImageData.offsetY : -ITEM_BOX_OFFSET;
      updateItem(setItemData, itemIdx, {
        x: Math.round(e.target.x() - ox),
        z: Math.round(e.target.y() - oy),
      });
    },
    [itemIdx, setItemData, itemImageData],
  );

  const itemName = useMemo(
    () => item ? getItemName(globals, item.type) : "",
    [item, globals]
  );

  // Load item image when toggle is on
  useEffect(() => {
    if (!showItemImages || !item) {
      Promise.resolve().then(() => setItemImageData(null));
      return;
    }

    loadItemImage(item.type, currentScene)
      .then((result) => {
        if (isOk(result)) {
          setItemImageData(result.value);
        } else {
          console.warn(
            `Failed to load image for item ${item.type}:`,
            result.error.message
          );
          setItemImageData(null);
        }
      })
      .catch((error) => {
        console.warn(
          `Unexpected error loading image for item ${item.type}:`,
          error instanceof Error ? error.message : String(error)
        );
        setItemImageData(null);
      });
  }, [showItemImages, item, currentScene]);

  if (item === null || item === undefined) return null;

  // If showing images and we have an image, render at natural sprite size.
  // The frame header's offsetX/offsetY map the sprite onto the item's world position
  // the same way the game does: drawX = item.x + offsetX, drawY = item.z + offsetY.
  if (showItemImages && itemImageData) {
    const { canvas, offsetX, offsetY } = itemImageData;
    const drawX = item.x + offsetX;
    const drawY = item.z + offsetY;
    return (
      <>
        <KonvaImage
          image={canvas}
          x={drawX}
          y={drawY}
          width={canvas.width}
          height={canvas.height}
          draggable
          onMouseOver={handleMouseOver}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onDragStart={handleMouseDown}
          onDragEnd={handleDragEnd}
        />

        {hovering && (
          <HoverNameTag
            x={drawX + canvas.width + ITEM_TAG_GAP}
            y={drawY}
            text={itemName}
            fill="red"
            textColor="black"
          />
        )}
      </>
    );
  }

  // Default: show box like original Item component
  const boxX = item.x - ITEM_BOX_OFFSET;
  const boxY = item.z - ITEM_BOX_OFFSET;
  return (
    <>
      <Rect
        x={boxX}
        y={boxY}
        width={ITEM_BOX_SIZE}
        height={ITEM_BOX_SIZE}
        stroke="red"
        fill="red"
        draggable
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onDragStart={handleMouseDown}
        onDragEnd={handleDragEnd}
        perfectDrawEnabled={false}
      />

      {!hovering && (
        <ItemTypeNumber
         x={boxX}
         y={boxY}
          value={item.type.toString()}
          fill="black"
        />
      )}

      {hovering && (
        <HoverNameTag
          x={boxX + ITEM_BOX_SIZE + ITEM_TAG_GAP}
          y={boxY}
          text={itemName}
          fill="red"
          textColor="black"
        />
      )}
    </>
  );
});
