import { Game } from "@/data/globals/globals";
import type { StandardHeader } from "@/python/structSpecs/LevelTypes";

export const BUGDOM_ACCESSIBILITY_MIN_GAP = 120;
export const NANOSAUR_MAX_REACHABLE_HEIGHT = 900;
export const NANOSAUR2_MAX_REACHABLE_HEIGHT = 1400;

const ACCESSIBILITY_MASK_ALPHA = 150;

export function supportsAccessibilityOverlay(game: Game): boolean {
  return (
    game === Game.BUGDOM ||
    game === Game.NANOSAUR ||
    game === Game.NANOSAUR_2
  );
}

export function getAccessibilityOverlayLabel(game: Game): string {
  switch (game) {
    case Game.BUGDOM:
      return `Mask low-ceiling areas (< ${BUGDOM_ACCESSIBILITY_MIN_GAP})`;
    case Game.NANOSAUR:
      return `Mask heights above ${NANOSAUR_MAX_REACHABLE_HEIGHT}`;
    case Game.NANOSAUR_2:
      return `Mask heights above ${NANOSAUR2_MAX_REACHABLE_HEIGHT}`;
    default:
      return "Mask inaccessible terrain";
  }
}

export function getAccessibilityOverlayHelp(game: Game): string | null {
  switch (game) {
    case Game.BUGDOM:
      return "Change BUGDOM_ACCESSIBILITY_MIN_GAP in this file to tune the ceiling clearance threshold.";
    case Game.NANOSAUR:
      return "Change NANOSAUR_MAX_REACHABLE_HEIGHT in this file to tune the Nanosaur 1 height limit.";
    case Game.NANOSAUR_2:
      return "Change NANOSAUR2_MAX_REACHABLE_HEIGHT in this file to tune the Nanosaur 2 height limit.";
    default:
      return null;
  }
}

function getAccessibilityMaskAlpha(
  inaccessible: boolean,
): [number, number, number, number] {
  return inaccessible ? [255, 64, 64, ACCESSIBILITY_MASK_ALPHA] : [0, 0, 0, 0];
}

export function isTerrainVertexInaccessible(
  game: Game,
  floorHeight: number,
  roofHeight: number | undefined,
): boolean {
  switch (game) {
    case Game.BUGDOM:
      return roofHeight !== undefined && roofHeight - floorHeight < BUGDOM_ACCESSIBILITY_MIN_GAP;
    case Game.NANOSAUR:
      return floorHeight > NANOSAUR_MAX_REACHABLE_HEIGHT;
    case Game.NANOSAUR_2:
      return floorHeight > NANOSAUR2_MAX_REACHABLE_HEIGHT;
    default:
      return false;
  }
}

export function buildAccessibilityMaskColors(
  game: Game,
  floorHeights: number[] | undefined,
  roofHeights: number[] | undefined,
): number[] {
  if (!supportsAccessibilityOverlay(game) || !floorHeights) {
    return [];
  }

  return floorHeights.flatMap((floorHeight, index) =>
    getAccessibilityMaskAlpha(
      isTerrainVertexInaccessible(game, floorHeight, roofHeights?.[index]),
    ),
  );
}

export function hasAccessibleOverlayData(
  game: Game,
  header: StandardHeader | undefined,
  floorHeights: number[] | undefined,
  roofHeights: number[] | undefined,
): boolean {
  if (!header || !floorHeights || floorHeights.length === 0) {
    return false;
  }

  if (game === Game.BUGDOM) {
    return roofHeights !== undefined && roofHeights.length === floorHeights.length;
  }

  return supportsAccessibilityOverlay(game);
}
