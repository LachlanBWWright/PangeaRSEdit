import { memo, useEffect, useRef } from "react";

/**
 * Renders an HTMLCanvasElement directly as a plain <canvas> element
 * without Konva overhead. Used in tile palettes where many small
 * tile previews need to be shown simultaneously.
 */
export const TileCanvas = memo(function TileCanvas({
  image,
  size = 32,
}: {
  image: HTMLCanvasElement | undefined;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target || !image) return;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
  }, [image, size]);

  return <canvas ref={ref} width={size} height={size} />;
});
