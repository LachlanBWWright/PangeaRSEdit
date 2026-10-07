import { Updater } from "use-immer";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Group, Rect, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
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
import { selectMapItemAtom, type MapItemTarget } from "./mapItemSelection";
import { useMapItemVisualState } from "./useMapItemVisualState";
import { useMapItemEditing } from "./mapItemEditingContext";

export const MightyMikeItem = memo(function MightyMikeItem({
  itemData,
  setItemData,
  itemIdx,
  selected,
  onHoverChange,
}: {
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  itemIdx: number;
  selected: boolean;
  onHoverChange: (tag: HoverTagInfo | null) => void;
}) {
  const selectMapItem = useSetAtom(selectMapItemAtom);
  const controller = useMapItemEditing();
  const target = useMemo<MapItemTarget>(() => ({ kind: "native", index: itemIdx }), [itemIdx]);
  const visual = useMapItemVisualState(target);
  const isSelected = selected || visual.selected;
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
    (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      event.cancelBubble = true;
      selectMapItem({ target, additive: event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey, forDrag: true });
    },
    [target, selectMapItem],
  );
  const handleDragStart = useCallback((event: Konva.KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true;
    if (controller) controller.startDrag(target);
    else selectMapItem({ target, forDrag: true });
  }, [controller, target, selectMapItem]);
  const handlePositionDrag = useCallback((event: Konva.KonvaEventObject<DragEvent>, finish: boolean) => {
    event.cancelBubble = true;
    const fallback = getFallbackFrameOffset();
    const offset = showItemImages && itemImageData
      ? { x: itemImageData.offsetX, y: itemImageData.offsetY } : fallback;
    const point = toDraggedItemPosition(event.target.x(), event.target.y(), offset.x, offset.y);
    if (controller) {
      if (finish) controller.finishDrag(target, point);
      else controller.previewDrag(target, point);
    } else if (finish) updateItem(setItemData, itemIdx, point);
  }, [controller, target, showItemImages, itemImageData, setItemData, itemIdx]);
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      handlePositionDrag(e, true);
    },
    [handlePositionDrag],
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
    const spritePosition = toSpritePosition(item.x + visual.offset.x, item.z + visual.offset.z, offsetX, offsetY);
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
      <Group name="map-item"
        x={spritePosition.x}
        y={spritePosition.y}
        draggable
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onDragStart={handleDragStart}
        onDragMove={(event) => handlePositionDrag(event, false)}
        onDragEnd={handleDragEnd}
      >
        <KonvaImage image={canvas} width={canvas.width} height={canvas.height} />
        {isSelected && <Rect width={canvas.width} height={canvas.height} stroke="#facc15" strokeWidth={2} listening={false} />}
      </Group>
    );
  }

  // Default: show box like original Item component
  const boxPosition = toBoxPosition(item.x + visual.offset.x, item.z + visual.offset.z);
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
    <Group
      name="map-item"
      x={boxPosition.x}
      y={boxPosition.y}
      draggable
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragMove={(event) => handlePositionDrag(event, false)}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={0}
        y={0}
        width={MIGHTY_MIKE_BOX_SIZE}
        height={MIGHTY_MIKE_BOX_SIZE}
        stroke={isSelected ? "#facc15" : "red"}
        strokeWidth={isSelected ? 2 : 1}
        fill={isSelected ? "red" : "#ef4444"}
        perfectDrawEnabled={false}
      />

      {!hovering && (
        <ItemTypeNumber x={0} y={0} value={item.type.toString()} fill="black" />
      )}
    </Group>
  );
});
