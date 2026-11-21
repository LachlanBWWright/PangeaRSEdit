import { useCallback, useState } from "react";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";

interface SavedLevelSnapshot {
  readonly session: number;
  readonly data: AtomicLevelData | null;
  readonly images?: HTMLCanvasElement[];
}

export function useLevelSaveStatus(data: AtomicLevelData, images: HTMLCanvasElement[] | undefined) {
  const [saved, setSaved] = useState<SavedLevelSnapshot>({ session: 0, data: null });
  const session = saved.session;
  const resetSavedLevel = useCallback(() => {
    setSaved((current) => ({ session: current.session + 1, data: null }));
  }, []);
  const markDataSaved = useCallback((snapshot: AtomicLevelData) => {
    setSaved((current) => current.session === session ? { ...current, data: snapshot } : current);
  }, [session]);
  const markImagesSaved = useCallback((snapshot: HTMLCanvasElement[]) => {
    setSaved((current) => current.session === session ? { ...current, images: snapshot } : current);
  }, [session]);
  const hasUnsavedChanges = saved.data === null ||
    saved.data.headerData !== data.headerData ||
    saved.data.itemData !== data.itemData ||
    saved.data.fenceData !== data.fenceData ||
    saved.data.splineData !== data.splineData ||
    saved.data.liquidData !== data.liquidData ||
    saved.data.terrainData !== data.terrainData ||
    saved.images !== images;

  return { hasUnsavedChanges, markDataSaved, markImagesSaved, resetSavedLevel };
}
