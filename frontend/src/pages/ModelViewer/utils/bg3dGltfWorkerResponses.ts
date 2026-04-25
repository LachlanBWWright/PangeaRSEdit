import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { err, ok, type Result } from "neverthrow";

export type ModelToGlbWorkerResponse = Extract<
  BG3DGltfWorkerResponse,
  {
    type:
      | "bg3d-to-glb"
      | "bg3d-with-skeleton-to-glb"
      | "model-with-skeleton-to-glb";
  }
>;

export type ParsedToGlbWorkerResponse = Extract<
  BG3DGltfWorkerResponse,
  { type: "bg3d-parsed-to-glb" }
>;

export type GlbToBg3dWorkerResponse = Extract<
  BG3DGltfWorkerResponse,
  { type: "glb-to-bg3d" }
>;

export function isModelToGlbWorkerResponse(
  response: BG3DGltfWorkerResponse,
): response is ModelToGlbWorkerResponse {
  return (
    response.type === "bg3d-to-glb" ||
    response.type === "bg3d-with-skeleton-to-glb" ||
    response.type === "model-with-skeleton-to-glb"
  );
}

function unexpectedWorkerResponseError(
  action: string,
  responseType: BG3DGltfWorkerResponse["type"],
): string {
  return `Failed to ${action}: unexpected worker response type ${responseType}`;
}

export function getModelToGlbWorkerResponse(
  response: BG3DGltfWorkerResponse,
  action: string,
): Result<ModelToGlbWorkerResponse, string> {
  if (response.type === "error") {
    return err("Failed to ${action}: ${response.error}");
  }
  if (!isModelToGlbWorkerResponse(response)) {
    return err(unexpectedWorkerResponseError(action, response.type));
  }
  return ok(response);
}

export function getParsedToGlbWorkerResponse(
  response: BG3DGltfWorkerResponse,
  action: string,
): Result<ParsedToGlbWorkerResponse, string> {
  if (response.type === "error") {
    return err("Failed to ${action}: ${response.error}");
  }
  if (response.type !== "bg3d-parsed-to-glb") {
    return err(unexpectedWorkerResponseError(action, response.type));
  }
  return ok(response);
}

export function getGlbToBg3dWorkerResponse(
  response: BG3DGltfWorkerResponse,
  action: string,
): Result<GlbToBg3dWorkerResponse, string> {
  if (response.type === "error") {
    return err("Failed to ${action}: ${response.error}");
  }
  if (response.type !== "glb-to-bg3d") {
    return err(unexpectedWorkerResponseError(action, response.type));
  }
  return ok(response);
}
