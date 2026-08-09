import { isLevelDataLike } from "@/data/utils/levelDataUtils";
import { ResultAsync, err, ok, type Result } from "neverthrow";
import {
  levelResizeWorkerResponseSchema,
  type LevelResizeWorkerRequest,
} from "./levelResizeProtocol";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

function parseResponse(value: unknown): Result<LevelData, string> {
  const parsed = levelResizeWorkerResponseSchema.safeParse(value);
  if (!parsed.success) return err("The resize worker returned invalid data.");
  if (!parsed.data.ok) return err(parsed.data.error);
  if (!isLevelDataLike(parsed.data.levelData)) {
    return err("The resize worker returned invalid level data.");
  }
  return ok(parsed.data.levelData);
}

export function runLevelResizeWorker(
  request: LevelResizeWorkerRequest,
): ResultAsync<LevelData, string> {
  return ResultAsync.fromPromise(
    new Promise<unknown>((resolve, reject) => {
      const worker = new Worker(new URL("./levelResize.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<unknown>) => {
        worker.terminate();
        resolve(event.data);
      };
      worker.onerror = () => {
        worker.terminate();
        reject(new Error("Level resize worker failed."));
      };
      worker.postMessage(request);
    }),
    () => "Level resize worker failed.",
  ).andThen(parseResponse);
}
