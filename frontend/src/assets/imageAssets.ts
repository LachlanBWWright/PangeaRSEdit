import { err, ok, ResultAsync, type Result } from "neverthrow";
import { parseTGAToCanvas } from "@/utils/tgaImageParser";
import { loadModelMaterialTexture } from "./modelTextures";
import { fetchAsset } from "@/assets/fetchAsset";
import { AssetCache } from "@/assets/assetCache";
import { versionedAssetUrl, type AssetFailure } from "@/assets/assetState";

export interface ImageAssetSource {
  url: string;
  format: "model" | "image" | "tga";
  materialIndex?: number;
  modelIndex?: number;
}

const textures = new AssetCache<HTMLCanvasElement>((canvas) => canvas.width * canvas.height * 4);

export function imageAssetKey(source: ImageAssetSource): string {
  return JSON.stringify([source.url, source.format, source.materialIndex ?? -1, source.modelIndex ?? -1]);
}

function loadImage(url: string): ResultAsync<HTMLCanvasElement, string> {
  return ResultAsync.fromSafePromise(new Promise<Result<HTMLImageElement, string>>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(ok(image));
    image.onerror = () => resolve(err(`Could not load ${url}`));
    image.src = versionedAssetUrl(url);
  })).andThen((result) => result).andThen((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return err("Canvas unavailable");
    context.drawImage(image, 0, 0);
    return ok(canvas);
  });
}

export function loadImageAsset(source: ImageAssetSource): ResultAsync<HTMLCanvasElement, string> {
  const key = imageAssetKey(source);
  return textures.get(key, () => {
    const loaded = source.format === "model"
    ? loadModelMaterialTexture(source.url, source.materialIndex ?? -1, source.modelIndex)
    : source.format === "image" ? loadImage(source.url)
      : fetchAsset(source.url).mapErr((error) => error.message)
        .andThen(parseTGAToCanvas);
    return loaded.mapErr((message): AssetFailure => ({ code: "decode", url: source.url, message }));
  }).mapErr((error) => error.message);
}
