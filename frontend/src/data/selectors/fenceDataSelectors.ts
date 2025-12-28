import { LevelData } from "@/python/structSpecs/LevelTypes";
import { FenceData, Fence, FenceNub } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

/**
 * Selects fence data from the full level data
 */
export function selectFenceData(levelData: LevelData): FenceData | null {
  if (!levelData.Fenc || !levelData.FnNb) return null;
  
  return {
    Fenc: levelData.Fenc,
    FnNb: levelData.FnNb
  };
}

/**
 * Gets the fences array directly
 */
export function selectFences(levelData: LevelData): Fence[] {
  return levelData.Fenc?.[1000]?.obj || [];
}

/**
 * Gets fence nubs for a specific fence ID
 */
export function selectFenceNubs(levelData: LevelData, fenceId: number): FenceNub[] {
  return levelData.FnNb?.[fenceId]?.obj || [];
}

/**
 * Gets a specific fence by index
 */
export function selectFence(levelData: LevelData, fenceIdx: number): Fence | null {
  const fences = selectFences(levelData);
  return fences[fenceIdx] || null;
}

/**
 * Updates a specific fence in the full level data
 */
export function updateFence(
  setLevelData: Updater<LevelData>,
  fenceIdx: number,
  fenceUpdate: Partial<Fence>
): void {
  setLevelData((draft) => {
    if (draft.Fenc?.[1000]?.obj?.[fenceIdx]) {
      Object.assign(draft.Fenc[1000].obj[fenceIdx], fenceUpdate);
    }
  });
}

/**
 * Updates fence nubs for a specific fence ID
 */
export function updateFenceNubs(
  setLevelData: Updater<LevelData>,
  fenceId: number,
  nubsUpdate: FenceNub[]
): void {
  setLevelData((draft) => {
    if (draft.FnNb?.[fenceId]) {
      draft.FnNb[fenceId].obj = nubsUpdate;
      // Update the fence's numNubs count if the fence exists
      if (draft.Fenc?.[1000]?.obj) {
        const fence = draft.Fenc[1000].obj.find((_, idx) => idx === fenceId);
        if (fence) {
          fence.numNubs = nubsUpdate.length;
        }
      }
    }
  });
}

/**
 * Adds a new fence with its nubs to the level data
 */
export function addFence(
  setLevelData: Updater<LevelData>,
  newFence: Fence,
  nubs: FenceNub[] = []
): void {
  setLevelData((draft) => {
    if (draft.Fenc?.[1000]?.obj && draft.FnNb) {
      const fenceIdx = draft.Fenc[1000].obj.length;
      draft.Fenc[1000].obj.push({...newFence, numNubs: nubs.length});
      
      // Add nubs with the fence index as ID
      draft.FnNb[fenceIdx] = {
        name: "Fence Nub List",
        obj: nubs,
        order: fenceIdx
      };
      
      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numFences = draft.Fenc[1000].obj.length;
      }
    }
  });
}

/**
 * Removes a fence and its nubs from the level data
 */
export function removeFence(
  setLevelData: Updater<LevelData>,
  fenceIdx: number
): void {
  setLevelData((draft) => {
    if (draft.Fenc?.[1000]?.obj && fenceIdx >= 0 && fenceIdx < draft.Fenc[1000].obj.length) {
      draft.Fenc[1000].obj.splice(fenceIdx, 1);
      
      // Remove corresponding nubs
      if (draft.FnNb?.[fenceIdx]) {
        delete draft.FnNb[fenceIdx];
      }
      
      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numFences = draft.Fenc[1000].obj.length;
      }
    }
  });
}

/**
 * Creates a fence-specific updater for a single fence
 */
export function createFenceUpdater(
  setLevelData: Updater<LevelData>,
  fenceIdx: number
): Updater<Fence> {
  return (fenceUpdater) => {
    setLevelData((draft) => {
      if (draft.Fenc?.[1000]?.obj?.[fenceIdx]) {
        if (typeof fenceUpdater === 'function') {
          fenceUpdater(draft.Fenc[1000].obj[fenceIdx]);
        } else {
          draft.Fenc[1000].obj[fenceIdx] = fenceUpdater;
        }
      }
    });
  };
}