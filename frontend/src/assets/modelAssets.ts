import { err, errAsync, ok, Result, ResultAsync, type Result as TypedResult } from "neverthrow";
import { z } from "zod";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { arrayBufferSchema } from "@/schemas/common";
import { AssetCache } from "./assetCache";
import { fetchAsset } from "./fetchAsset";
import type { AssetFailure } from "./assetState";

let nextRequest = 0;
let nextWorker = 0;
const workerIds = new WeakMap<Worker, number>();
const workerRequests = new WeakMap<Worker, Set<() => void>>();
const closedWorkers = new WeakSet<Worker>();
const models = new AssetCache<GLTF>(() => 1, 32, 32);
const responseSchema = z.object({ type: z.string(), requestId: z.string().optional(), result: z.unknown().optional(), error: z.string().optional() });

export function convertBg3dToGltf(worker: Worker, buffer: ArrayBuffer): ResultAsync<ArrayBuffer, string> {
  if (closedWorkers.has(worker)) return errAsync("Model worker cancelled");
  return ResultAsync.fromSafePromise(new Promise<TypedResult<ArrayBuffer, string>>((resolve) => {
    const requestId = `asset-${++nextRequest}`;
    let done = false;
    const finish = (result: TypedResult<ArrayBuffer, string>) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      worker.removeEventListener("message", message);
      worker.removeEventListener("error", error);
      workerRequests.get(worker)?.delete(cancel);
      resolve(result);
    };
    const message = (event: MessageEvent<unknown>) => {
      const parsed = responseSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.requestId !== requestId) return;
      if (parsed.data.type === "error") { finish(err(parsed.data.error ?? "Native model conversion failed")); return; }
      const bufferResult = arrayBufferSchema.safeParse(parsed.data.result);
      finish(parsed.data.type === "bg3d-to-glb" && bufferResult.success ? ok(bufferResult.data) : err("Invalid model worker response"));
    };
    const error = (event: ErrorEvent) => finish(err(event.message || "The model worker stopped"));
    const timeout = setTimeout(() => finish(err("Native model conversion timed out")), 60_000);
    const cancel = () => finish(err("Model worker cancelled"));
    const pending = workerRequests.get(worker) ?? new Set<() => void>();
    pending.add(cancel);
    workerRequests.set(worker, pending);
    worker.addEventListener("message", message);
    worker.addEventListener("error", error);
    const posted = Result.fromThrowable(() => worker.postMessage({ type: "bg3d-to-glb", buffer, requestId }), () => "Could not send native model to worker")();
    if (posted.isErr()) finish(err(posted.error));
  })).andThen((result) => result);
}

export function loadFileGltf(worker: Worker, url: string): ResultAsync<GLTF, AssetFailure> {
  let workerId = workerIds.get(worker);
  if (workerId === undefined) { workerId = ++nextWorker; workerIds.set(worker, workerId); }
  return models.get(`${workerId}:${url}`, () => fetchAsset(url)
    .andThen((bytes) => convertBg3dToGltf(worker, bytes).mapErr((message): AssetFailure => ({ code: message === "Model worker cancelled" ? "cancelled" : "conversion", url, message })))
    .andThen((glb) => ResultAsync.fromPromise(new GLTFLoader().parseAsync(glb, ""),
      (): AssetFailure => ({ code: "decode", url, message: `Could not load the converted model: ${url}` }))));
}

export function closeAssetWorker(worker: Worker) {
  closedWorkers.add(worker);
  for (const cancel of [...(workerRequests.get(worker) ?? [])]) cancel();
  workerRequests.delete(worker);
  worker.terminate();
}
