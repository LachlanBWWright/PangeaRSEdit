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
import { ResultAsync } from "neverthrow";
import {
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ITEM_TAG_GAP,
  ItemTypeNumber,
} from "../shared/nodeVisuals";
import type { HoverTagInfo } from "../shared/nodeVisuals";
import { mapErr } from "@/utils/mapErr";

export const MightyMikeItem = memo(function MightyMikeItem({
  itemData,
  setItemData,
  itemIdx,
  onHoverChange,
}: {
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  itemIdx: number;
  onHoverChange: (tag: HoverTagInfo | null) => void;
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
    const loadImageData = async () => {
      const loadResult = await ResultAsync.fromPromise(
        loadItemImage(item.type, currentScene),
        mapErr,
      );

      if (loadResult.isErr()) {
        console.warn(
          `Unexpected error loading image for item ${item.type}:`,
          loadResult.error.message,
        );
        setItemImageData(null);
        return;
      }

      const result = loadResult.value;
      if (result.isOk()) {
        setItemImageData(result.value);
      } else {
        console.warn(`Failed to load image for item ${item.type}:`, result.error.message);
        setItemImageData(null);
      }
    };

    void loadImageData();
  }, [showItemImages, item, currentScene]);

  if (item === null || item === undefined) return null;

  // If showing images and we have an image, render at natural sprite size.
  // The frame header's offsetX/offsetY map the sprite onto the item's world position
  // the same way the game does: drawX = item.x + offsetX, drawY = item.z + offsetY.
  if (showItemImages && itemImageData) {
    const { canvas, offsetX, offsetY } = itemImageData;
    const drawX = item.x + offsetX;
    const drawY = item.z + offsetY;
    const handleMouseOver = () => {
      setHovering(true);
      onHoverChange({ x: drawX + canvas.width + ITEM_TAG_GAP, y: drawY, text: itemName, fill: "red", textColor: "black" });
    };
    const handleMouseLeave = () => {
      setHovering(false);
      onHoverChange(null);
    };
    return (
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
    );
  }

  // Default: show box like original Item component
  const boxX = item.x - ITEM_BOX_OFFSET;
  const boxY = item.z - ITEM_BOX_OFFSET;
  const handleMouseOver = () => {
    setHovering(true);
    onHoverChange({ x: boxX + ITEM_BOX_SIZE + ITEM_TAG_GAP, y: boxY, text: itemName, fill: "red", textColor: "black" });
  };
  const handleMouseLeave = () => {
    setHovering(false);
    onHoverChange(null);
  };
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
    </>
  );
});

