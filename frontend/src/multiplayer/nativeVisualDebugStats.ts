export interface NativeVisualDebugStats {
  readonly frameNumber: number | null;
  readonly hasDesync: boolean | null;
  readonly lastSyncHash: number | null;
  readonly lastVisualEventSequence: number | null;
  readonly appliedVisualEventSequence: number | null;
  readonly duplicateVisualEventCount: number | null;
  readonly staleVisualEventCount: number | null;
}

const emptyNativeVisualDebugStats: NativeVisualDebugStats = {
  frameNumber: null,
  hasDesync: null,
  lastSyncHash: null,
  lastVisualEventSequence: null,
  appliedVisualEventSequence: null,
  duplicateVisualEventCount: null,
  staleVisualEventCount: null,
};

export function readNativeVisualDebugStats(): NativeVisualDebugStats {
  const runtimeWindow = globalThis.window;
  if (!runtimeWindow) {
    return emptyNativeVisualDebugStats;
  }
  return {
    frameNumber: runtimeWindow.PangeaGame_DebugGetFrameNumber?.() ?? null,
    hasDesync:
      runtimeWindow.PangeaGame_DebugHasDesync !== undefined
        ? runtimeWindow.PangeaGame_DebugHasDesync() !== 0
        : null,
    lastSyncHash: runtimeWindow.PangeaGame_DebugGetLastSyncHash?.() ?? null,
    lastVisualEventSequence:
      runtimeWindow.PangeaGame_DebugGetLastVisualEventSequence?.() ?? null,
    appliedVisualEventSequence:
      runtimeWindow.PangeaGame_DebugGetAppliedVisualEventSequence?.() ?? null,
    duplicateVisualEventCount:
      runtimeWindow.PangeaGame_DebugGetDuplicateVisualEventCount?.() ?? null,
    staleVisualEventCount:
      runtimeWindow.PangeaGame_DebugGetStaleVisualEventCount?.() ?? null,
  };
}
