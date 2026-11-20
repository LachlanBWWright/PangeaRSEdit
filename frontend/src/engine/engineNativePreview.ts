import { err } from "neverthrow";
import { enginePreviewStatusSchema, type HostError } from "@pangea/desktop-contracts";
import { desktopRequest } from "@/platform/desktop/client";
import { replaceEngineJSON, validateEnginePackage, type EnginePackage } from "./enginePackage";

export async function startEngineNativePreview(packageData: EnginePackage, sceneId?: string) {
  const validation = validateEnginePackage(packageData);
  if (validation.isErr()) return err<never, HostError>({ code: "invalid", message: validation.error });
  if (sceneId && !validation.value.scenes.some((scene) => scene.id === sceneId)) return err<never, HostError>({ code: "invalid", message: "Select a scene from this package before previewing." });
  const preview = sceneId ? replaceEngineJSON(packageData, "package.json", { ...validation.value, initialScene: sceneId }) : packageData;
  return desktopRequest({ operation: "engine.preview", files: preview.files.map((file) => ({ path: file.path, bytes: new Uint8Array(file.bytes) })) }, enginePreviewStatusSchema);
}
