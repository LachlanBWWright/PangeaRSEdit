import { err, type Result } from "neverthrow";
import type { SpriteRead } from "@pangea/desktop-contracts";
import type { SpriteData } from "../types";
import type { Palette } from "./paletteUtils";
import { readSpriteSheetFiles } from "./readSpriteSheetFiles";
import type { SpriteSheetPreview } from "./spriteSheetImport";

export async function previewLinkedSprite(source: SpriteRead, data: SpriteData, palette: Palette): Promise<Result<SpriteSheetPreview, string>> {
  const shape = data.data.shapes[source.asset.shapeIndex];
  if (!shape) return err("The linked shape no longer exists in this asset.");
  const image = new File([Uint8Array.from(source.imageBytes)], "source.png", { type: "image/png" });
  const metadata = source.metadataBytes ? new File([Uint8Array.from(source.metadataBytes)], "source.json", { type: "application/json" }) : null;
  return readSpriteSheetFiles(image, metadata, shape, palette.colors);
}

export function replaceLinkedSprite(data: SpriteData, shapeIndex: number, preview: SpriteSheetPreview): SpriteData {
  return { ...data, data: { ...data.data, shapes: data.data.shapes.map((shape, index) => index === shapeIndex ? preview.shape : shape) } };
}
