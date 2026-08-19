import { useEffect, useRef } from "react";
import { drawNanosaurPathTile } from "./nanosaurPathTileVisuals";

export function NanosaurPathTileThumbnail({ value }: { readonly value: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = ref.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, 24, 24);
    drawNanosaurPathTile(context, value, 0, 0, 24);
  }, [value]);
  return <canvas ref={ref} width={24} height={24} className="h-6 w-6 rounded" />;
}
