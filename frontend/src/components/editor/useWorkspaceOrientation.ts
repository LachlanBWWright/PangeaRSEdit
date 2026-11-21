import { useSyncExternalStore } from "react";

const narrowWorkspace = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const query = window.matchMedia?.(narrowWorkspace);
  query?.addEventListener?.("change", callback);
  return () => query?.removeEventListener?.("change", callback);
}

function isNarrowWorkspace() {
  return window.matchMedia?.(narrowWorkspace)?.matches ?? false;
}

export function useWorkspaceOrientation() {
  return useSyncExternalStore(
    subscribe,
    isNarrowWorkspace,
    () => false,
  ) ? "vertical" : "horizontal";
}
