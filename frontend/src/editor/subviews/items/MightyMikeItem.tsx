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
import {
  loadItemImage,
  type ItemFrameImage,
} from "@/utils/mightyMikeShapeImageLoader";
import { CurrentScene } from "@/data/game/gameAtoms";
import { ResultAsync } from "neverthrow";
import { ItemTypeNumber } from "../shared/nodeVisuals";
import type { HoverTagInfo } from "../shared/nodeVisuals";
import { mapErr } from "@/utils/mapErr";
import {
  createHoverTag,
  getFallbackFrameOffset,
  MIGHTY_MIKE_BOX_SIZE,
  toBoxPosition,
  toDraggedItemPosition,
  toSpritePosition,
} from "@/editor/subviews/items/mightyMikeItemState";

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
    [itemData.Itms, itemIdx],
  );
  const [hovering, setHovering] = useState(false);
  const globals = useAtomValue(Globals);
  const showItemImages = useAtomValue(ShowMightyMikeItemImages);
  const currentScene = useAtomValue(CurrentScene);
  const [itemImageData, setItemImageData] = useState<ItemFrameImage | null>(
    null,
  );

  const handleMouseDown = useCallback(
    () => setSelectedItem(itemIdx),
    [itemIdx, setSelectedItem],
  );
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const fallbackOffset = getFallbackFrameOffset();
      const offsetX = itemImageData ? itemImageData.offsetX : fallbackOffset.x;
      const offsetY = itemImageData ? itemImageData.offsetY : fallbackOffset.y;
      updateItem(
        setItemData,
        itemIdx,
        toDraggedItemPosition(e.target.x(), e.target.y(), offsetX, offsetY),
      );
    },
    [itemIdx, setItemData, itemImageData],
  );

  const itemName = useMemo(
    () => (item ? getItemName(globals, item.type) : ""),
    [item, globals],
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
          loadResult.error,
        );
        setItemImageData(null);
        return;
      }

      const result = loadResult.value;
      if (result.isOk()) {
        setItemImageData(result.value);
      } else {
        console.warn(
          `Failed to load image for item ${item.type}:`,
          result.error,
        );
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
    const spritePosition = toSpritePosition(item.x, item.z, offsetX, offsetY);
    const handleMouseOver = () => {
      setHovering(true);
      onHoverChange(
        createHoverTag(
          spritePosition.x,
          spritePosition.y,
          canvas.width,
          itemName,
        ),
      );
    };
    const handleMouseLeave = () => {
      setHovering(false);
      onHoverChange(null);
    };
    return (
      <KonvaImage
        image={canvas}
        x={spritePosition.x}
        y={spritePosition.y}
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
  const boxPosition = toBoxPosition(item.x, item.z);
  const handleMouseOver = () => {
    setHovering(true);
    onHoverChange(
      createHoverTag(
        boxPosition.x,
        boxPosition.y,
        MIGHTY_MIKE_BOX_SIZE,
        itemName,
      ),
    );
  };
  const handleMouseLeave = () => {
    setHovering(false);
    onHoverChange(null);
  };
  return (
    <>
      <Rect
        x={boxPosition.x}
        y={boxPosition.y}
        width={MIGHTY_MIKE_BOX_SIZE}
        height={MIGHTY_MIKE_BOX_SIZE}
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
          x={boxPosition.x}
          y={boxPosition.y}
          value={item.type.toString()}
          fill="black"
        />
      )}
    </>
  );
});
