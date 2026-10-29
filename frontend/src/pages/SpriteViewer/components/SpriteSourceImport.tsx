import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { shapeFrameToCanvas } from "@/parsers/mightyMikeShapesParser";
import type { SpriteData } from "../types";
import type { Palette } from "../utils/paletteUtils";
import type { SpriteSheetPreview } from "../utils/spriteSheetImport";
import { readSpriteSheetFiles } from "../utils/readSpriteSheetFiles";
import { EditorPanel } from "./EditorPanel";

interface Props {
  readonly data: SpriteData;
  readonly palette: Palette;
  readonly selectedShapeIndex: number;
  readonly onApply: (expected: SpriteData, replacement: SpriteData) => void;
}

interface Pending {
  readonly data: SpriteData;
  readonly palette: Palette;
  readonly result: SpriteSheetPreview;
  readonly shapeIndex: number;
}

function drawPreview(canvas: HTMLCanvasElement | null, preview: SpriteSheetPreview, palette: Palette, index: number) {
  if (!canvas) return;
  const frame = preview.shape.frames[index];
  if (!frame) return;
  const rendered = shapeFrameToCanvas(frame, palette.colors);
  if (rendered.isErr()) return;
  canvas.width = rendered.value.width;
  canvas.height = rendered.value.height;
  canvas.getContext("2d")?.drawImage(rendered.value, 0, 0);
}

export function SpriteSourceImport({ data, palette, selectedShapeIndex, onApply }: Props) {
  const image = useRef<File | null>(null);
  const metadata = useRef<File | null>(null);
  const generation = useRef(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  useEffect(() => () => { generation.current++; }, []);
  const current = pending?.data === data && pending.palette === palette && pending.shapeIndex === selectedShapeIndex ? pending : null;
  const shape = data.data.shapes[selectedShapeIndex];
  const preview = async () => {
    const sourceImage = image.current;
    const sourceMetadata = metadata.current;
    if (!sourceImage || !shape) { setError("Choose a PNG, then select a shape. Animated sheets also need exported JSON."); return; }
    const token = ++generation.current;
    setBusy(true); setError(null); setPending(null);
    const result = await readSpriteSheetFiles(sourceImage, sourceMetadata, shape, palette.colors);
    if (token !== generation.current) return;
    setBusy(false);
    if (result.isErr()) { setError(result.error); return; }
    setFrameIndex(0);
    setPending({ data, palette, result: result.value, shapeIndex: selectedShapeIndex });
  };
  return <EditorPanel title="Import from a sprite editor">
    <p className="text-xs text-gray-400">Import a PNG for a single-frame shape, or a PNG sheet and JSON from Aseprite. Keep native origins, flags and animation commands.</p>
    <label className="block text-xs">Sheet PNG<input className="mt-1 block w-full text-xs" type="file" accept=".png" onChange={(event) => { image.current = event.currentTarget.files?.[0] ?? null; generation.current++; setPending(null); setBusy(false); }} /></label>
    <label className="block text-xs">Sheet JSON (animated sheets)<input className="mt-1 block w-full text-xs" type="file" accept=".json" onChange={(event) => { metadata.current = event.currentTarget.files?.[0] ?? null; generation.current++; setPending(null); setBusy(false); }} /></label>
    <Button size="sm" variant="outline" disabled={busy || !shape} onClick={() => void preview()}>{busy ? "Converting…" : "Preview native conversion"}</Button>
    {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
    {current && <div className="space-y-2 text-xs">
      <label className="block">Preview frame<select className="ml-2 bg-gray-800" value={frameIndex} onChange={(event) => setFrameIndex(Number(event.currentTarget.value))}>{current.result.frames.map((frame, index) => <option key={index} value={index}>{frame.name}</option>)}</select></label>
      <canvas aria-label="Converted native sprite preview" className="max-h-48 max-w-full border border-gray-600 [image-rendering:pixelated]" ref={(canvas) => drawPreview(canvas, current.result, palette, frameIndex)} />
      <p>{current.result.changedColors} pixels use the nearest palette color. {current.result.partialAlpha} pixels have partial transparency converted to a binary mask.</p>
      <p>Source frame names and durations are for reference. Native animation commands and timing remain unchanged.</p>
      <Button size="sm" onClick={() => {
        const shapes = data.data.shapes.map((entry) => entry === shape ? current.result.shape : entry);
        onApply(data, { ...data, data: { ...data.data, shapes } });
        setPending(null);
      }}>{current.result.changedColors || current.result.partialAlpha ? "Accept conversion and replace frames" : "Replace shape frames"}</Button>
    </div>}
  </EditorPanel>;
}
