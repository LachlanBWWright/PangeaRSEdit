import type { MutableRefObject } from "react";
import type Konva from "konva";
import { View } from "@/editor/viewEnum";

interface FenceSelectionArgs {
  readonly setSelectedFence: (idx: number) => void;
  readonly setActiveView: (view: View) => void;
  readonly setSelectedFenceNub: (nubIdx: number) => void;
  readonly fenceIndex: number;
  readonly nubIndex: number;
}

export function selectFenceNub({
  setSelectedFence,
  setActiveView,
  setSelectedFenceNub,
  fenceIndex,
  nubIndex,
}: FenceSelectionArgs): void {
  setSelectedFence(fenceIndex);
  setActiveView(View.fences);
  setSelectedFenceNub(nubIndex);
}

function getRoundedNodePosition(
  e: Konva.KonvaEventObject<DragEvent>,
): [number, number] {
  return [Math.round(e.target.x()), Math.round(e.target.y())];
}

interface FenceNubDragMoveArgs {
  readonly event: Konva.KonvaEventObject<DragEvent>;
  readonly nubIndex: number;
  readonly rafRef: MutableRefObject<number | null>;
  readonly onPreviewNub: (nubIdx: number, nub: [number, number]) => void;
}

export function previewFenceNubDrag({
  event,
  nubIndex,
  rafRef,
  onPreviewNub,
}: FenceNubDragMoveArgs): void {
  const nextNub = getRoundedNodePosition(event);
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
  }
  rafRef.current = requestAnimationFrame(() => {
    onPreviewNub(nubIndex, nextNub);
  });
}

interface FenceNubDragEndArgs {
  readonly event: Konva.KonvaEventObject<DragEvent>;
  readonly nubIndex: number;
  readonly rafRef: MutableRefObject<number | null>;
  readonly setNub: (nubIdx: number, nub: [number, number]) => void;
}

export function commitFenceNubDrag({
  event,
  nubIndex,
  rafRef,
  setNub,
}: FenceNubDragEndArgs): void {
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
  }
  setNub(nubIndex, getRoundedNodePosition(event));
}
