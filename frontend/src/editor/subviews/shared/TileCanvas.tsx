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
    const scale = Math.min(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  }, [image, size]);

  return <canvas ref={ref} width={size} height={size} />;
});
