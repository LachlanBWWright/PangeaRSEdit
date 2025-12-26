import { Updater } from "use-immer";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Label, Rect, Tag, Text, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, useCallback, memo, useEffect, useMemo } from "react";
import { Globals } from "@/data/globals/globals";
import { getItemName } from "@/data/items/getItemNames";
import { selectItem, updateItem } from "../../../data/selectors";
import { ShowMightyMikeItemImages } from "./MightyMikeItemMenu";
import { loadItemImage } from "@/utils/mightyMikeShapeImageLoader";
import { CurrentScene } from "@/data/game/gameAtoms";
import { isOk } from "@/types/result";

const ITEM_BOX_SIZE = 12;
const ITEM_BOX_OFFSET = ITEM_BOX_SIZE / 2;

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
  const [itemImage, setItemImage] = useState<HTMLCanvasElement | null>(null);

  const handleMouseOver = useCallback(() => setHovering(true), []);
  const handleMouseLeave = useCallback(() => setHovering(false), []);
  const handleMouseDown = useCallback(
    () => setSelectedItem(itemIdx),
    [itemIdx, setSelectedItem],
  );
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      updateItem(setItemData, itemIdx, {
        x: Math.round(e.target.x() + ITEM_BOX_OFFSET),
        z: Math.round(e.target.y() + ITEM_BOX_OFFSET),
      });
    },
    [itemIdx, setItemData],
  );

  const itemX = useMemo(() => item?.x ? item.x - ITEM_BOX_OFFSET : 0, [item?.x]);
  const itemZ = useMemo(() => item?.z ? item.z - ITEM_BOX_OFFSET : 0, [item?.z]);
  const itemName = useMemo(
    () => item ? getItemName(globals, item.type) : "",
    [item, globals]
  );

  // Load item image when toggle is on
  useEffect(() => {
    if (!showItemImages || !item) {
      // Reset state asynchronously
      Promise.resolve().then(() => setItemImage(null));
      return;
    }

    loadItemImage(item.type, currentScene)
      .then((result) => {
        if (isOk(result)) {
          setItemImage(result.value);
        } else {
          console.warn(
            `Failed to load image for item ${item.type}:`,
            result.error.message
          );
          setItemImage(null);
        }
      })
      .catch((error) => {
        console.warn(
          `Unexpected error loading image for item ${item.type}:`,
          error instanceof Error ? error.message : String(error)
        );
        setItemImage(null);
      });
  }, [showItemImages, item, currentScene]);

  if (item === null || item === undefined) return null;

  // If showing images and we have an image, use Konva Image instead of Rect
  if (showItemImages && itemImage) {
    return (
      <>
        <KonvaImage
          image={itemImage}
          x={itemX}
          y={itemZ}
          width={ITEM_BOX_SIZE}
          height={ITEM_BOX_SIZE}
          draggable
          onMouseOver={handleMouseOver}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onDragStart={handleMouseDown}
          onDragEnd={handleDragEnd}
        />

        {hovering && (
          <Label opacity={1} x={item.x + 15} y={item.z}>
            <Tag fill="red" />
            <Text text={itemName} fontSize={8} fill="black" />
          </Label>
        )}
      </>
    );
  }

  // Default: show box like original Item component
  return (
    <>
      <Rect
        x={itemX}
        y={itemZ}
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
      />

      <Text
        text={item.type.toString()}
        fill="black"
        visible={!hovering}
        fontSize={8}
        x={itemX}
        y={itemZ}
        draggable
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
      />

      {hovering && (
        <Label opacity={1} x={item.x + 15} y={item.z}>
          <Tag fill="red" />
          <Text text={itemName} fontSize={8} fill="black" />
        </Label>
      )}
    </>
  );
});
