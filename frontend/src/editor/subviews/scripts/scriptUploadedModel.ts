import { err, ok, ResultAsync, Result } from "neverthrow";
import { z } from "zod";
import { arrayBufferSchema } from "@/schemas/common";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parse3DMF } from "@/modelParsers/parse3dmf";
import { parseBG3DWithSkeleton } from "@/modelParsers/bg3dWithSkeleton";
import type { BG3DParseResult } from "@/modelParsers/parseBG3D";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { validateParsedNativeModel } from "./scriptAssetValidation";
import { selectNativeModelObject } from "./scriptNativeModelObjects";

export async function parseUploadedObjectModel(
  visual: { readonly modelPath: string; readonly modelObject: number; readonly skeletonPath: string },
  assets: ScriptWorkspaceState["assets"],
): Promise<Result<BG3DParseResult, string>> {
  const model = assets[visual.modelPath];
  if (!model) return err(`Upload the model ${visual.modelPath} to preview collision.`);
  if (visual.modelPath.toLowerCase().endsWith(".shapes")) return err("Shapes use the sprite-plane collision projections above.");
  const buffer = Uint8Array.from(model.bytes).buffer;
  let parsed: Result<BG3DParseResult, string>;
  if (visual.skeletonPath) {
    const skeleton = assets[`${visual.skeletonPath}.rsrc`];
    if (!skeleton) return err(`Upload the skeleton ${visual.skeletonPath}.rsrc to preview animation and collision.`);
    parsed = await parseBG3DWithSkeleton(buffer, Uint8Array.from(skeleton.bytes).buffer);
  } else {
    parsed = visual.modelPath.toLowerCase().endsWith(".3dmf") ? parse3DMF(buffer) : parseBG3D(buffer);
  }
  if (parsed.isErr()) return err(parsed.error);
  const errors = validateParsedNativeModel(parsed.value, visual.modelPath);
  if (errors.length) return err(errors.join("; "));
  if (visual.skeletonPath) return parsed;
  return selectNativeModelObject(parsed.value, visual.modelObject);
}

export function convertUploadedModel(worker: Pick<Worker, "addEventListener" | "removeEventListener" | "postMessage">, parsed: BG3DParseResult, signal: AbortSignal): ResultAsync<ArrayBuffer, string> {
  return ResultAsync.fromSafePromise(new Promise<Result<ArrayBuffer, string>>((resolve) => {
    const finish = (result: Result<ArrayBuffer, string>) => {
      clearTimeout(timeout);
      worker.removeEventListener("message", message);
      worker.removeEventListener("error", failure);
      signal.removeEventListener("abort", cancel);
      resolve(result);
    };
    const message = (event: MessageEvent<unknown>) => {
      const response = workerResponse.safeParse(event.data);
      if (!response.success) { finish(err("Invalid model conversion response.")); return; }
      finish(response.data.type === "error" ? err(response.data.error) : ok(response.data.result));
    };
    const failure = () => finish(err("Model conversion worker stopped."));
    const cancel = () => finish(err("Model conversion cancelled."));
    const timeout = setTimeout(() => finish(err("Model conversion timed out.")), 60_000);
    worker.addEventListener("message", message);
    worker.addEventListener("error", failure);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) { cancel(); return; }
    const posted = Result.fromThrowable(() => worker.postMessage({ type: "bg3d-parsed-to-glb", parsed }), () => "Could not send model to conversion worker.")();
    if (posted.isErr()) finish(err(posted.error));
  })).andThen((result) => result);
}

const workerResponse = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bg3d-parsed-to-glb"), result: arrayBufferSchema }),
  z.object({ type: z.literal("error"), error: z.string() }),
]);
