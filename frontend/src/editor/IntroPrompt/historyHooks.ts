/**
 * History management types and hooks for IntroPrompt
 */

import { useAtom } from "jotai";
import { useCallback } from "react";
import { Updater, useImmer } from "use-immer";
import { BlockHistoryUpdate } from "../../data/globals/history";
import type { AtomicLevelData } from "../../data/utils/levelDataUtils";

export interface DataHistory {
  items: AtomicLevelData[];
  index: number;
}

export function useDataHistory() {
  const [dataHistory, setDataHistory] = useImmer<DataHistory>({
    items: [],
    index: 0,
  });
  const [blockHistoryUpdate, setBlockHistoryUpdate] =
    useAtom(BlockHistoryUpdate);

  const undoData = useCallback(
    (
      dataHistory: DataHistory,
      setAllAtomicData: (data: AtomicLevelData) => void,
    ) => {
      if (dataHistory.index > 0) {
        setDataHistory((draft) => {
          draft.index -= 1;
        });
        const historyItem = dataHistory.items[dataHistory.index - 1];
        if (historyItem) {
          setAllAtomicData(historyItem);
          setBlockHistoryUpdate(true);
        }
      }
    },
    [setDataHistory, setBlockHistoryUpdate],
  );

  const redoData = useCallback(
    (
      dataHistory: DataHistory,
      setAllAtomicData: (data: AtomicLevelData) => void,
    ) => {
      if (dataHistory.index < dataHistory.items.length - 1) {
        setDataHistory((draft) => {
          draft.index += 1;
        });
        const historyItem = dataHistory.items[dataHistory.index + 1];
        if (historyItem) {
          setAllAtomicData(historyItem);
          setBlockHistoryUpdate(true);
        }
      }
    },
    [setDataHistory, setBlockHistoryUpdate],
  );

  return {
    dataHistory,
    setDataHistory,
    blockHistoryUpdate,
    setBlockHistoryUpdate,
    undoData,
    redoData,
  };
}

export function useAtomicDataUpdaters<T>(
  setter: Updater<T | null>,
): Updater<T> {
  return useCallback(
    (updater) => {
      setter((current) => {
        if (!current) return current;
        if (typeof updater === "function") {
          // Updater has a broad union type and isn't directly callable after narrowing.
          return Reflect.apply(updater, undefined, [current]);
        }
        return updater;
      });
    },
    [setter],
  );
}
