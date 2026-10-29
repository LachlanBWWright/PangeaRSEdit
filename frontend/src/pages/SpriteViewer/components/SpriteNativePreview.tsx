import { useState } from "react";
import { shapeFrameToCanvas } from "@/parsers/mightyMikeShapesParser";
import type { Palette } from "../utils/paletteUtils";
import type { SpriteSheetPreview } from "../utils/spriteSheetImport";

export function SpriteNativePreview({ preview, palette }: { readonly preview: SpriteSheetPreview; readonly palette: Palette }) {
  const [index, setIndex] = useState(0);
  const frame = preview.shape.frames[index] ?? preview.shape.frames[0];
  return <div className="space-y-2">
    <label className="block text-xs">Converted frame<select className="ml-2 bg-gray-800" value={index} onChange={(event) => setIndex(Number(event.currentTarget.value))}>{preview.frames.map((entry, position) => <option key={position} value={position}>{entry.name}</option>)}</select></label>
    <canvas aria-label="Converted linked sprite preview" className="max-h-48 max-w-full border border-gray-600 [image-rendering:pixelated]" ref={(canvas) => {
      if (!canvas || !frame) return;
      const result = shapeFrameToCanvas(frame, palette.colors);
      if (result.isErr()) return;
      canvas.width = result.value.width;
      canvas.height = result.value.height;
      canvas.getContext("2d")?.drawImage(result.value, 0, 0);
    }} />
  </div>;
}
