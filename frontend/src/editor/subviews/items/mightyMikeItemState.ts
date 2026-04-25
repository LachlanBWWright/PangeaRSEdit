import {
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ITEM_TAG_GAP,
} from "@/editor/subviews/shared/nodeVisuals";
import type { HoverTagInfo } from "@/editor/subviews/shared/nodeVisuals";

export interface DrawPosition {
  readonly x: number;
  readonly y: number;
}

export function toBoxPosition(itemX: number, itemZ: number): DrawPosition {
  return {
    x: itemX - ITEM_BOX_OFFSET,
    y: itemZ - ITEM_BOX_OFFSET,
  };
}

export function toSpritePosition(
  itemX: number,
  itemZ: number,
  offsetX: number,
  offsetY: number,
): DrawPosition {
  return {
    x: itemX + offsetX,
    y: itemZ + offsetY,
  };
}

export function createHoverTag(
  drawX: number,
  drawY: number,
  width: number,
  text: string,
): HoverTagInfo {
  return {
    x: drawX + width + ITEM_TAG_GAP,
    y: drawY,
    text,
    fill: "red",
    textColor: "black",
  };
}

export function toDraggedItemPosition(
  stageX: number,
  stageY: number,
  offsetX: number,
  offsetY: number,
): { x: number; z: number } {
  return {
    x: Math.round(stageX - offsetX),
    z: Math.round(stageY - offsetY),
  };
}

export function getFallbackFrameOffset(): { x: number; y: number } {
  return {
    x: -ITEM_BOX_OFFSET,
    y: -ITEM_BOX_OFFSET,
  };
}

export const MIGHTY_MIKE_BOX_SIZE = ITEM_BOX_SIZE;
