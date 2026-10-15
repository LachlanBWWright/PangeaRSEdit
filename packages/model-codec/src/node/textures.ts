import type { Document } from "@gltf-transform/core";
import { err, ok, type Result } from "neverthrow";
import { pngToRgba8Result } from "../modelParsers/image/pngArgb";
import { decodeJpegNodeResult } from "../utils/jpegDecompress";
import { copyArrayBuffer } from "./boundaries";

export function validateNativeTextures(document: Document): Result<void, string> {
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image) return err(`Texture '${texture.getName()}' has no image data.`);
    const mime = texture.getMimeType();
    if (mime !== "image/png" && mime !== "image/jpeg") return err(`Unsupported native texture type '${mime}'. Convert textures to PNG or JPEG first.`);
    const decoded = mime === "image/png" ? pngToRgba8Result(image) : decodeJpegNodeResult(copyArrayBuffer(image));
    if (decoded.isErr()) return err(`Texture '${texture.getName()}': ${decoded.error}`);
    const { width, height } = decoded.value;
    if (width <= 0 || height <= 0 || width > 16384 || height > 16384) return err(`Texture '${texture.getName()}' has unsupported dimensions ${width}×${height}.`);
  }
  return ok(undefined);
}
