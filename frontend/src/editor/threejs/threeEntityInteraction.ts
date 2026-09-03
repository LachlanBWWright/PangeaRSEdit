import { Ray } from "three";
import { getItemDragPlanePoint } from "./threeItemInteraction";

export type ThreeEntityKind = "fence" | "water" | "spline";

export interface ThreeEntityDragState {
  readonly kind: ThreeEntityKind;
  readonly entityIndex: number;
  readonly pointIndex: number;
  readonly pointerId: number;
  readonly startX: number;
  readonly startZ: number;
  readonly startWorldX: number;
  readonly startWorldZ: number;
}

export function createThreeEntityDragState(
  kind: ThreeEntityKind,
  entityIndex: number,
  pointIndex: number,
  pointerId: number,
  startX: number,
  startZ: number,
  ray: Ray,
): ThreeEntityDragState | null {
  const point = getItemDragPlanePoint(ray);
  if (!point) return null;
  return {
    kind,
    entityIndex,
    pointIndex,
    pointerId,
    startX,
    startZ,
    startWorldX: point.x,
    startWorldZ: point.z,
  };
}

export function getDraggedEntityPlacement(
  drag: ThreeEntityDragState,
  scale: number,
  ray: Ray,
): { readonly x: number; readonly z: number } | null {
  const point = getItemDragPlanePoint(ray);
  if (!point) return null;
  return {
    x: Math.round(drag.startX + (point.x - drag.startWorldX) / scale),
    z: Math.round(drag.startZ + (point.z - drag.startWorldZ) / scale),
  };
}
