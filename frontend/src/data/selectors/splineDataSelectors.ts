import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { 
  SplineData, 
  ottoSpline, 
  ottoSplineNub, 
  ottoSplinePoint, 
  ottoSplineItem 
} from "../../python/structSpecs/ottoMaticLevelData";
import { Updater } from "use-immer";

/**
 * Selects spline data from the full level data
 */
export function selectSplineData(levelData: ottoMaticLevel): SplineData | null {
  if (!levelData.Spln || !levelData.SpNb || !levelData.SpPt || !levelData.SpIt) return null;
  
  return {
    Spln: levelData.Spln,
    SpNb: levelData.SpNb,
    SpPt: levelData.SpPt,
    SpIt: levelData.SpIt
  };
}

/**
 * Gets the splines array directly
 */
export function selectSplines(levelData: ottoMaticLevel): ottoSpline[] {
  return levelData.Spln?.[1000]?.obj || [];
}

/**
 * Gets spline nubs for a specific spline ID
 */
export function selectSplineNubs(levelData: SplineData, splineId: number): ottoSplineNub[] {
  return levelData.SpNb?.[splineId]?.obj || [];
}

/**
 * Gets spline points for a specific spline ID
 */
export function selectSplinePoints(levelData: SplineData, splineId: number): ottoSplinePoint[] {
  return levelData.SpPt?.[splineId]?.obj || [];
}

/**
 * Gets spline items for a specific spline ID
 */
export function selectSplineItems(levelData: SplineData, splineId: number): ottoSplineItem[] {
  return levelData.SpIt?.[splineId]?.obj || [];
}

/**
 * Gets a specific spline by index
 */
export function selectSpline(levelData: ottoMaticLevel, splineIdx: number): ottoSpline | null {
  const splines = selectSplines(levelData);
  return splines[splineIdx] || null;
}

/**
 * Updates a specific spline in the full level data
 */
export function updateSpline(
  setLevelData: Updater<ottoMaticLevel>,
  splineIdx: number,
  splineUpdate: Partial<ottoSpline>
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
  nubsUpdate: ottoSplineNub[]
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
  pointsUpdate: ottoSplinePoint[]
): void {
  setLevelData((draft) => {
    if (draft.SpPt?.[splineId]) {
      draft.SpPt[splineId].obj = pointsUpdate;
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
  setLevelData: Updater<ottoMaticLevel>,
  splineId: number,
  itemsUpdate: ottoSplineItem[]
): void {
  setLevelData((draft) => {
    if (draft.SpIt?.[splineId]) {
      draft.SpIt[splineId].obj = itemsUpdate;
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
  setLevelData: Updater<ottoMaticLevel>,
  newSpline: ottoSpline,
  nubs: ottoSplineNub[] = [],
  points: ottoSplinePoint[] = [],
  items: ottoSplineItem[] = []
): void {
  setLevelData((draft) => {
    if (draft.Spln?.[1000]?.obj && draft.SpNb && draft.SpPt && draft.SpIt) {
      const splineIdx = draft.Spln[1000].obj.length;
      
      // Add the spline with correct counts
      draft.Spln[1000].obj.push({
        ...newSpline,
        numNubs: nubs.length,
        numPoints: points.length,
        numItems: items.length
      });
      
      // Add associated data with the spline index as ID
      draft.SpNb[splineIdx] = {
        name: "Spline Nub List",
        obj: nubs,
        order: splineIdx
      };
      
      draft.SpPt[splineIdx] = {
        name: "Spline Point List",
        obj: points,
        order: splineIdx
      };
      
      draft.SpIt[splineIdx] = {
        name: "Spline Item List",
        obj: items,
        order: splineIdx
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
  setLevelData: Updater<ottoMaticLevel>,
  splineIdx: number
): void {
  setLevelData((draft) => {
    if (draft.Spln?.[1000]?.obj && splineIdx >= 0 && splineIdx < draft.Spln[1000].obj.length) {
      draft.Spln[1000].obj.splice(splineIdx, 1);
      
      // Remove associated data
      if (draft.SpNb?.[splineIdx]) {
        delete draft.SpNb[splineIdx];
      }
      if (draft.SpPt?.[splineIdx]) {
        delete draft.SpPt[splineIdx];
      }
      if (draft.SpIt?.[splineIdx]) {
        delete draft.SpIt[splineIdx];
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
  setLevelData: Updater<ottoMaticLevel>,
  splineIdx: number
): Updater<ottoSpline> {
  return (splineUpdater) => {
    setLevelData((draft) => {
      if (draft.Spln?.[1000]?.obj?.[splineIdx]) {
        if (typeof splineUpdater === 'function') {
          splineUpdater(draft.Spln[1000].obj[splineIdx]);
        } else {
          draft.Spln[1000].obj[splineIdx] = splineUpdater;
        }
      }
    });
  };
}