/// <reference lib="webworker" />

import { combineLevelData, isLevelDataLike, splitLevelData } from "@/data/utils/levelDataUtils";
import {
  applyResizeToAtomicData,
  applySupertileResizeToAtomicData,
} from "@/editor/utils/levelResizeHandlers";
import { levelResizeWorkerRequestSchema } from "./levelResizeProtocol";

self.onmessage = (event: MessageEvent<unknown>) => {
  const parsedRequest = levelResizeWorkerRequestSchema.safeParse(event.data);
  if (!parsedRequest.success) {
    self.postMessage({ ok: false, error: "Invalid level resize request." });
    return;
  }

  const request = parsedRequest.data;
  const levelData = request.levelData;
  if (!isLevelDataLike(levelData)) {
    self.postMessage({ ok: false, error: "Invalid level data." });
    return;
  }
  const atomicData = splitLevelData(levelData);
  const result =
    request.mode === "supertiles"
      ? applySupertileResizeToAtomicData(atomicData, request.globals, request.options)
      : applyResizeToAtomicData(atomicData, request.globals, request.options);
  if (result.isErr()) {
    self.postMessage({ ok: false, error: result.error });
    return;
  }

  const combined = combineLevelData(result.value.data);
  self.postMessage(
    combined.isErr()
      ? { ok: false, error: combined.error }
      : { ok: true, levelData: combined.value },
  );
};
