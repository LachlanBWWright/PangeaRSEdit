import { useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { ItemFilterState, FilterMode, FilterPresets, DEFAULT_FILTER_STATE } from "../data/items/itemFilterAtoms";

export function useFilterShortcuts() {
  const [filter, setFilter] = useAtom(ItemFilterState);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // 1-4 keys for quick presets
    if (e.key >= '1' && e.key <= '4') {
      const presetIndex = parseInt(e.key) - 1;
      const preset = FilterPresets[presetIndex];
      if (preset) {
        setFilter((prev) => ({ ...prev, ...preset.state }));
      }
    }

    // Escape resets filters
    if (e.key === 'Escape' && filter.mode !== FilterMode.SHOW_ALL) {
      setFilter(DEFAULT_FILTER_STATE);
    }
  }, [filter.mode, setFilter]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
