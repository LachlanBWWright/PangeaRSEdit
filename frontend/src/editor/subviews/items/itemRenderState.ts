import {
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ITEM_TAG_GAP,
} from "@/editor/subviews/shared/nodeVisuals";
import { getItemName } from "@/data/items/getItemNames";
import {
  getLiquidPatchDimensions,
  getLiquidPatchStyle,
} from "@/data/items/liquidPatchItems";
import type { GlobalsInterface } from "@/data/globals/globals";
import type { HoverTagInfo } from "@/editor/subviews/shared/nodeVisuals";

export function getItemBoxPosition(
  x: number,
  z: number,
): { x: number; z: number } {
  return { x: x - ITEM_BOX_OFFSET, z: z - ITEM_BOX_OFFSET };
}

export function getDefaultItemHoverTag(
  globals: GlobalsInterface,
  itemType: number,
  itemX: number,
  itemZ: number,
): HoverTagInfo {
  return {
    x: itemX + ITEM_BOX_SIZE + ITEM_TAG_GAP,
    y: itemZ,
    text: getItemName(globals, itemType),
    fill: "red",
    textColor: "black",
  };
}

export function getLiquidPatchLayout(
  globals: GlobalsInterface,
  itemType: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  itemPosX: number,
  itemPosZ: number,
): {
  style: ReturnType<typeof getLiquidPatchStyle>;
  dimensions: ReturnType<typeof getLiquidPatchDimensions>;
  rectX: number;
  rectZ: number;
} | null {
  const style = getLiquidPatchStyle(globals, itemType);
  if (!style) {
    return null;
  }

  const dimensions = getLiquidPatchDimensions(
    globals,
    itemType,
    p0,
    p1,
    p2,
    p3,
  );
  const rectX = itemPosX - dimensions.width2D / 2;
  const rectZ = itemPosZ - dimensions.depth2D / 2;
  return {
    style,
    dimensions,
    rectX,
    rectZ,
  };
}

export function getLiquidHoverTag(
  name: string,
  rectX: number,
  width: number,
  itemZ: number,
): HoverTagInfo {
  return {
    x: rectX + width + ITEM_TAG_GAP,
    y: itemZ - ITEM_BOX_OFFSET,
    text: name,
    fill: "red",
    textColor: "white",
  };
}
