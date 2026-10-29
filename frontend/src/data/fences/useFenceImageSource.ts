import { useMemo } from "react";
import { useImageAsset } from "@/assets/useImageAsset";

export function useFenceImageSource(src: string | null): string | null {
  const valid = src && /\.(png|jpe?g|webp|gif|bmp|svg|tga)(?:[?#]|$)/i.test(src);
  const canvas = useImageAsset(valid ? { url: src, format: /\.tga(?:[?#]|$)/i.test(src) ? "tga" : "image" } : null);
  return useMemo(() => canvas?.toDataURL("image/png") ?? null, [canvas]);
}
