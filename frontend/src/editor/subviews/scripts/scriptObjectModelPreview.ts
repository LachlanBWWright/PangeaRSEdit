import { err, ok, Result, type Result as TypedResult } from "neverthrow";
import { Game } from "@/data/globals/globals";
import { runWorkerMessage } from "@/pages/ModelViewer/hooks/useFileUploadHelpers";
import { getModelToGlbWorkerResponse } from "@/pages/ModelViewer/utils/bg3dGltfWorkerResponses";
import type { ScriptAssetFile } from "./scriptWorkspaceState";
import { getObjectModelBounds, type ObjectModelBounds } from "./scriptObjectModelBounds";

export function objectPreviewGame(gameId: string): Game {
  switch (gameId) {
    case "Bugdom-android": return Game.BUGDOM;
    case "Bugdom2-Android": return Game.BUGDOM_2;
    case "Nanosaur-android": return Game.NANOSAUR;
    case "Nanosaur2-Android": return Game.NANOSAUR_2;
    case "CroMagRally-Android": return Game.CRO_MAG;
    case "BillyFrontier-Android": return Game.BILLY_FRONTIER;
    case "MightyMike-Android": return Game.MIGHTY_MIKE;
    default: return Game.OTTO_MATIC;
  }
}

export async function buildObjectModelPreviewURL(asset: ScriptAssetFile, scale: number, modelIndex?: number): Promise<TypedResult<{ url: string; bounds: TypedResult<ObjectModelBounds, string> }, string>> {
  if (!asset.path.endsWith(".bg3d") && !asset.path.endsWith(".3dmf")) return err("This viewer previews BG3D and 3DMF model assets.");
  const buffer = new Uint8Array(asset.bytes).buffer;
  const response = await runWorkerMessage({ type: "bg3d-to-glb", buffer });
  if (response.isErr()) return err(response.error);
  const model = getModelToGlbWorkerResponse(response.value, "preview the uploaded model");
  if (model.isErr()) return err(model.error);
  const result = Result.fromThrowable(() => URL.createObjectURL(new Blob([model.value.result], { type: "model/gltf-binary" })), () => "Could not create the model preview")();
  return result.isOk() ? ok({ url: result.value, bounds: getObjectModelBounds(model.value.parsed, scale, modelIndex) }) : err(result.error);
}
