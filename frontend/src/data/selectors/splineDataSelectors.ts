import { LevelData } from "@/python/structSpecs/LevelTypes";
import {
  SplineData,
  Spline,
  SplineNub,
  SplinePoint,
  SplineItem,
} from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

/**
 * Selects spline data from the full level data
 */
export function selectSplineData(levelData: LevelData): SplineData | null {
  if (!levelData.Spln || !levelData.SpNb || !levelData.SpPt || !levelData.SpIt)
    return null;

  return {
    Spln: levelData.Spln,
    SpNb: levelData.SpNb,
    SpPt: levelData.SpPt,
    SpIt: levelData.SpIt,
  };
}

/**
 * Gets the splines array directly
 */
export function selectSplines(levelData: LevelData): Spline[] {
  return levelData.Spln?.[1000]?.obj || [];
}

/**
 * Gets spline nubs for a specific spline ID
 */
export function selectSplineNubs(
  levelData: SplineData,
  splineId: number,
): SplineNub[] {
  return levelData.SpNb?.[splineId]?.obj || [];
}

/**
 * Gets spline points for a specific spline ID
 */
export function selectSplinePoints(
  levelData: SplineData,
  splineId: number,
): SplinePoint[] {
  return levelData.SpPt?.[splineId]?.obj || [];
}

/**
 * Gets spline items for a specific spline ID
 */
export function selectSplineItems(
  levelData: SplineData,
  splineId: number,
): SplineItem[] {
  return levelData.SpIt?.[splineId]?.obj || [];
}

/**
 * Gets a specific spline by index
 */
export function selectSpline(
  levelData: LevelData,
  splineIdx: number,
): Spline | null {
  const splines = selectSplines(levelData);
  return splines[splineIdx] || null;
}

/**
 * Updates a specific spline in the full level data
 */
export function updateSpline(
  setLevelData: Updater<LevelData>,
  splineIdx: number,
  splineUpdate: Partial<Spline>,
): void {
  setLevelData((draft) => {
    if (draft.Spln?.[1000]?.obj?.[splineIdx]) {
      Object.assign(draft.Spln[1000].obj[splineIdx], splineUpdate);
    }
  });
}

/**
 * Updates spline nubs for a specific spline ID
 */
export function updateSplineNubs(
  setLevelData: Updater<SplineData>,
  splineId: number,
  nubsUpdate: SplineNub[],
): void {
  setLevelData((draft) => {
    if (draft.SpNb?.[splineId]) {
      draft.SpNb[splineId].obj = nubsUpdate;
      // Update the spline's numNubs count
      if (draft.Spln?.[1000]?.obj?.[splineId]) {
        draft.Spln[1000].obj[splineId].numNubs = nubsUpdate.length;
      }
    }
  });
}

/**
 * Updates spline points for a specific spline ID
 */
export function updateSplinePoints(
  setLevelData: Updater<SplineData>,
  splineId: number,
  pointsUpdate: SplinePoint[],
): void {
  setLevelData((draft) => {
    const splineKey = 1000 + splineId;
    if (draft.SpPt?.[splineKey]) {
      draft.SpPt[splineKey].obj = pointsUpdate;
      // Update the spline's numPoints count
      if (draft.Spln?.[1000]?.obj?.[splineId]) {
        draft.Spln[1000].obj[splineId].numPoints = pointsUpdate.length;
      }
    }
  });
}

/**
 * Updates spline items for a specific spline ID
 */
export function updateSplineItems(
  setLevelData: Updater<LevelData>,
  splineId: number,
  itemsUpdate: SplineItem[],
): void {
  setLevelData((draft) => {
    const splineKey = 1000 + splineId;
    if (draft.SpIt?.[splineKey]) {
      draft.SpIt[splineKey].obj = itemsUpdate;
      // Update the spline's numItems count
      if (draft.Spln?.[1000]?.obj?.[splineId]) {
        draft.Spln[1000].obj[splineId].numItems = itemsUpdate.length;
      }
    }
  });
}

/**
 * Adds a new spline with its associated data to the level
 */
export function addSpline(
  setLevelData: Updater<LevelData>,
  newSpline: Spline,
  nubs: SplineNub[] = [],
  points: SplinePoint[] = [],
  items: SplineItem[] = [],
): void {
  setLevelData((draft) => {
    if (draft.Spln?.[1000]?.obj && draft.SpNb && draft.SpPt && draft.SpIt) {
      const splineIdx = draft.Spln[1000].obj.length;
      const splineKey = 1000 + splineIdx;

      // Add the spline with correct counts
      draft.Spln[1000].obj.push({
        ...newSpline,
        numNubs: nubs.length,
        numPoints: points.length,
        numItems: items.length,
      });

      // Add associated data with the spline index as ID
      draft.SpNb[splineKey] = {
        name: "Spline Nub List",
        obj: nubs,
        order: splineKey,
      };

      draft.SpPt[splineKey] = {
        name: "Spline Point List",
        obj: points,
        order: splineKey,
      };

      draft.SpIt[splineKey] = {
        name: "Spline Item List",
        obj: items,
        order: splineKey,
      };

      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numSplines = draft.Spln[1000].obj.length;
      }
    }
  });
}

/**
 * Removes a spline and all its associated data from the level
 */
export function removeSpline(
  setLevelData: Updater<LevelData>,
  splineIdx: number,
): void {
  setLevelData((draft) => {
    if (
      draft.Spln?.[1000]?.obj &&
      splineIdx >= 0 &&
      splineIdx < draft.Spln[1000].obj.length
    ) {
      draft.Spln[1000].obj.splice(splineIdx, 1);
      const splineKey = 1000 + splineIdx;

      // Remove associated data using Reflect for computed key deletion
      if (draft.SpNb && splineKey in draft.SpNb) {
        Reflect.deleteProperty(draft.SpNb, splineKey);
      }
      if (draft.SpPt && splineKey in draft.SpPt) {
        Reflect.deleteProperty(draft.SpPt, splineKey);
      }
      if (draft.SpIt && splineKey in draft.SpIt) {
        Reflect.deleteProperty(draft.SpIt, splineKey);
      }

      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numSplines = draft.Spln[1000].obj.length;
      }
    }
  });
}

/**
 * Creates a spline-specific updater for a single spline
 */
export function createSplineUpdater(
  setLevelData: Updater<LevelData>,
  splineIdx: number,
): Updater<Spline> {
  return (splineUpdater) => {
    setLevelData((draft) => {
      if (draft.Spln?.[1000]?.obj?.[splineIdx]) {
        if (typeof splineUpdater === "function") {
          splineUpdater(draft.Spln[1000].obj[splineIdx]);
        } else {
          draft.Spln[1000].obj[splineIdx] = splineUpdater;
        }
      }
    });
  };
}
